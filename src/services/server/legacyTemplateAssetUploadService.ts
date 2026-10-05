import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { SignJWT, jwtVerify } from "jose";
import {
  createPresignedUploadUrlForKey,
  downloadFileFromR2,
  uploadFileToR2Key,
} from "@/lib/r2";
import type {
  LegacyAssetDetail,
  LegacyAssetOwner,
  LegacyAssetUpload,
} from "@/types/legacy-template-assets";
import {
  LegacyAssetError,
  legacyAssetStoragePath,
  MAX_LEGACY_ASSET_BYTES,
  parseLegacyAssetUpload,
} from "@/utils/legacy-template-assets/contracts";
import { registerLegacyAssetVersion } from "./legacyTemplateAssetService";

const ticketKey = () => {
  if (!process.env.JWT_SECRET)
    throw new LegacyAssetError("업로드 서명 설정이 필요합니다.", 503);
  return new TextEncoder().encode(process.env.JWT_SECRET);
};
export const legacyAssetEnvironment = () => {
  const value = process.env.LEGACY_TEMPLATE_ASSET_ENV;
  if (!value || !/^[a-z0-9_-]{1,32}$/.test(value))
    throw new LegacyAssetError(
      "LEGACY_TEMPLATE_ASSET_ENV 설정이 필요합니다.",
      503,
    );
  return value;
};
export function verifyLegacyImageBytes(
  buffer: Buffer,
  upload: LegacyAssetUpload,
): { width: number; height: number } {
  parseLegacyAssetUpload(upload);
  if (
    buffer.length !== upload.byteSize ||
    buffer.length > MAX_LEGACY_ASSET_BYTES ||
    createHash("sha256").update(buffer).digest("hex") !== upload.contentHash
  )
    throw new LegacyAssetError(
      "업로드된 이미지 크기 또는 해시가 일치하지 않습니다.",
    );
  const require = createRequire(`${process.cwd()}/package.json`);
  const sizeOf = require("next/dist/compiled/image-size") as (
    bytes: Buffer,
  ) => { width?: number; height?: number; type?: string };
  let result: ReturnType<typeof sizeOf>;
  try {
    result = sizeOf(buffer);
  } catch {
    throw new LegacyAssetError("이미지 파일을 해석할 수 없습니다.");
  }
  const detected = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
  }[result.type ?? ""];
  if (
    detected !== upload.mimeType ||
    !result.width ||
    !result.height ||
    result.width * result.height > 80_000_000
  )
    throw new LegacyAssetError("이미지 형식이나 해상도가 올바르지 않습니다.");
  return { width: result.width, height: result.height };
}
export async function presignLegacyAssetUpload(
  owner: LegacyAssetOwner,
  detail: LegacyAssetDetail,
  upload: LegacyAssetUpload,
  actorId: number,
) {
  if (!detail.versions.some((v) => v.asset_id === upload.assetId))
    throw new LegacyAssetError(
      "등록된 이미지 슬롯의 파일만 교체할 수 있습니다.",
    );
  const environment = legacyAssetEnvironment();
  const stagingKey = `legacy-template-asset-uploads/${environment}/${randomUUID()}`;
  const ticket = await new SignJWT({
    ...owner,
    upload,
    stagingKey,
    actorId,
    setId: detail.set.id,
    environment,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("legacy-template-asset-upload")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(ticketKey());
  const signed = await createPresignedUploadUrlForKey(
    stagingKey,
    upload.mimeType,
    5 * 60,
  );
  return {
    uploadUrl: signed.uploadUrl,
    ticket,
    headers: { "Content-Type": upload.mimeType },
  };
}
export async function verifyLegacyAssetUpload(
  owner: LegacyAssetOwner,
  detail: LegacyAssetDetail,
  token: string,
  actorId: number,
) {
  let claims;
  try {
    claims = (
      await jwtVerify(token, ticketKey(), {
        audience: "legacy-template-asset-upload",
        algorithms: ["HS256"],
      })
    ).payload;
  } catch {
    throw new LegacyAssetError(
      "업로드 확인 시간이 만료되었거나 서명이 올바르지 않습니다.",
    );
  }
  const environment = legacyAssetEnvironment();
  if (
    claims.actorId !== actorId ||
    claims.setId !== detail.set.id ||
    claims.ownerKind !== owner.ownerKind ||
    claims.templateId !== owner.templateId ||
    (claims.purpose ?? "runtime") !== (owner.purpose ?? "runtime") ||
    claims.environment !== environment ||
    typeof claims.stagingKey !== "string" ||
    !claims.stagingKey.startsWith(
      `legacy-template-asset-uploads/${environment}/`,
    )
  )
    throw new LegacyAssetError("다른 템플릿 또는 사용자의 업로드입니다.", 403);
  const upload = parseLegacyAssetUpload(claims.upload);
  const staged = await downloadFileFromR2(
    claims.stagingKey,
    MAX_LEGACY_ASSET_BYTES,
  );
  const dimensions = verifyLegacyImageBytes(staged.buffer, upload);
  const storagePath = legacyAssetStoragePath(owner, environment, upload);
  // Promote the verified bytes, not a later copy of the mutable presigned object.
  await uploadFileToR2Key(staged.buffer, storagePath, upload.mimeType);
  return registerLegacyAssetVersion(
    {
      asset_set_id: detail.set.id,
      asset_id: upload.assetId,
      content_hash: upload.contentHash,
      storage_path: storagePath,
      mime_type: upload.mimeType,
      byte_size: staged.buffer.length,
      ...dimensions,
      original_filename: upload.originalFilename,
    },
    actorId,
  );
}
