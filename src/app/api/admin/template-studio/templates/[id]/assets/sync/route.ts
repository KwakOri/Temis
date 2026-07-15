import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import {
  deleteFilesFromR2,
  getFileMetadataFromR2,
  getFileUrl,
  uploadFileToR2Key,
} from "@/lib/r2";
import {
  getTemplateStudioAssetMetadata,
  getTemplateStudioTemplate,
  upsertTemplateStudioAssetMetadata,
} from "@/services/server/templateStudioPersistenceService";
import {
  buildTemplateStudioAssetTemplatePrefix,
  sanitizeTemplateStudioPathSegment,
} from "@/utils/template-studio/asset-storage";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const STORAGE_PROVIDER = "r2";

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

type SyncAssetPayload = {
  assetId: string;
  label: string;
  src: string;
  localContentHash?: string;
  mimeType?: string;
  byteSize?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseDataUrl = (src: string) => {
  const match = src.match(/^data:([^;,]+)((?:;[^,]+)*),([\s\S]*)$/);
  if (!match) return null;

  const mimeType = match[1];
  const extension = MIME_EXTENSION[mimeType];
  if (!extension) return null;

  const parameters = match[2]
    .split(";")
    .map((parameter) => parameter.trim().toLowerCase())
    .filter(Boolean);
  const data = match[3];
  let buffer: Buffer;

  try {
    buffer = parameters.includes("base64")
      ? Buffer.from(data, "base64")
      : Buffer.from(decodeURIComponent(data), "utf8");
  } catch {
    return null;
  }

  if (buffer.byteLength === 0) return null;

  return {
    buffer,
    extension,
    mimeType,
  };
};

const getSyncAssets = (body: unknown): SyncAssetPayload[] | null => {
  if (!isRecord(body) || !Array.isArray(body.assets)) return null;

  const assets: SyncAssetPayload[] = [];

  for (const asset of body.assets) {
    if (!isRecord(asset)) return null;

    const assetId = typeof asset.assetId === "string" ? asset.assetId : "";
    const label = typeof asset.label === "string" ? asset.label : "";
    const src = typeof asset.src === "string" ? asset.src : "";
    const localContentHash =
      typeof asset.localContentHash === "string"
        ? asset.localContentHash
        : undefined;
    const mimeType =
      typeof asset.mimeType === "string" ? asset.mimeType : undefined;
    const byteSize =
      typeof asset.byteSize === "number" && Number.isFinite(asset.byteSize)
        ? asset.byteSize
        : undefined;

    if (!assetId || !label || !src) return null;
    assets.push({
      assetId,
      label,
      src,
      localContentHash,
      mimeType,
      byteSize,
    });
  }

  return assets;
};

const getContentHash = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");

const buildTemplateStudioAssetKey = ({
  templateId,
  assetId,
  contentHash,
  extension,
}: {
  templateId: string;
  assetId: string;
  contentHash: string;
  extension: string;
}): string =>
  `${buildTemplateStudioAssetTemplatePrefix(templateId)}/assets/${sanitizeTemplateStudioPathSegment(
    assetId,
    "asset",
  )}/${contentHash}.${extension}`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  const uploadedFileKeys: string[] = [];

  try {
    const templateId = await parseTemplateStudioTemplateId({ params });
    if (!templateId) {
      return templateStudioBadTemplateIdResponse();
    }

    const template = await getTemplateStudioTemplate(templateId);
    if (!template) {
      return templateStudioTemplateNotFoundResponse();
    }

    const assets = getSyncAssets(await request.json());
    if (!assets) {
      return NextResponse.json(
        { error: "동기화할 Template Studio asset 목록이 필요합니다." },
        { status: 400 },
      );
    }

    const syncedAssets = [];

    for (const asset of assets) {
      const parsed = parseDataUrl(asset.src);
      if (!parsed) {
        return NextResponse.json(
          { error: `지원하지 않는 asset data URL입니다: ${asset.label}` },
          { status: 400 },
        );
      }

      const contentHash = getContentHash(parsed.buffer);
      if (asset.localContentHash && asset.localContentHash !== contentHash) {
        return NextResponse.json(
          { error: `asset hash가 일치하지 않습니다: ${asset.label}` },
          { status: 400 },
        );
      }

      if (asset.mimeType && asset.mimeType !== parsed.mimeType) {
        return NextResponse.json(
          { error: `asset MIME 타입이 일치하지 않습니다: ${asset.label}` },
          { status: 400 },
        );
      }

      if (asset.byteSize !== undefined && asset.byteSize !== parsed.buffer.length) {
        return NextResponse.json(
          { error: `asset 크기가 일치하지 않습니다: ${asset.label}` },
          { status: 400 },
        );
      }

      const existing = await getTemplateStudioAssetMetadata(
        templateId,
        asset.assetId,
      );
      const existingPublicUrl =
        existing?.publicUrl ??
        (existing?.storageProvider === STORAGE_PROVIDER
          ? getFileUrl(existing.storagePath)
          : null);
      const isExistingMatch =
        existing?.storageProvider === STORAGE_PROVIDER &&
        existing.contentHash === contentHash &&
        existing.mimeType === parsed.mimeType &&
        existing.byteSize === parsed.buffer.length &&
        Boolean(existingPublicUrl);

      if (isExistingMatch && existingPublicUrl) {
        try {
          await getFileMetadataFromR2(existing.storagePath);
          syncedAssets.push({
            id: asset.assetId,
            label: asset.label,
            src: existingPublicUrl,
            storageProvider: STORAGE_PROVIDER,
            storagePath: existing.storagePath,
            publicUrl: existingPublicUrl,
            contentHash,
            mimeType: parsed.mimeType,
            byteSize: parsed.buffer.length,
            uploaded: false,
            lastSyncedAt: existing.lastSyncedAt,
          });
          continue;
        } catch {
          // Metadata can outlive an object; fall through and repair by upload.
        }
      }

      const storagePath = buildTemplateStudioAssetKey({
        templateId,
        assetId: asset.assetId,
        contentHash,
        extension: parsed.extension,
      });
      const upload = await uploadFileToR2Key(
        parsed.buffer,
        storagePath,
        parsed.mimeType,
      );
      uploadedFileKeys.push(upload.fileKey);
      const syncedAt = new Date().toISOString();
      await upsertTemplateStudioAssetMetadata({
        templateId,
        assetId: asset.assetId,
        storageProvider: STORAGE_PROVIDER,
        storagePath: upload.fileKey,
        publicUrl: upload.url,
        contentHash,
        mimeType: parsed.mimeType,
        byteSize: parsed.buffer.length,
        createdBy: actor.userId,
        lastSyncedAt: syncedAt,
      });
      uploadedFileKeys.splice(uploadedFileKeys.indexOf(upload.fileKey), 1);

      syncedAssets.push({
        id: asset.assetId,
        label: asset.label,
        src: upload.url,
        storageProvider: STORAGE_PROVIDER,
        storagePath: upload.fileKey,
        publicUrl: upload.url,
        contentHash,
        mimeType: parsed.mimeType,
        byteSize: parsed.buffer.length,
        uploaded: true,
        lastSyncedAt: syncedAt,
      });
    }

    return NextResponse.json({
      success: true,
      templateId,
      assets: syncedAssets,
    });
  } catch (error) {
    if (uploadedFileKeys.length > 0) {
      await deleteFilesFromR2(uploadedFileKeys).catch(() => null);
    }

    console.error("Template Studio asset sync error:", error);
    return NextResponse.json(
      { error: "Template Studio asset 동기화 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
