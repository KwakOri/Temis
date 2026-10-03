import type {
  LegacyAssetChange,
  LegacyAssetDetail,
  LegacyAssetOwner,
  LegacyAssetRuntime,
  LegacyAssetSet,
  LegacyAssetVersion,
} from "@/types/legacy-template-assets";
import { MAX_LEGACY_ASSET_BYTES } from "@/utils/legacy-template-assets/contracts";

const base = "/api/admin/legacy-template-assets";
const path = (owner: LegacyAssetOwner) =>
  `${base}/${encodeURIComponent(owner.ownerKind)}/${encodeURIComponent(owner.templateId)}`;
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error ?? "에셋을 불러오지 못했습니다.");
  return data as T;
}
export const LegacyTemplateAssetService = {
  list: () => request<{ sets: LegacyAssetSet[] }>(base),
  detail: (owner: LegacyAssetOwner) => request<LegacyAssetDetail>(path(owner)),
  preview: (owner: LegacyAssetOwner, changes: LegacyAssetChange[]) =>
    request<LegacyAssetRuntime>(path(owner), { action: "preview", changes }),
  apply: (
    owner: LegacyAssetOwner,
    expectedRevisionId: string | null,
    changes: LegacyAssetChange[],
    note: string,
  ) =>
    request<{ revisionId: string }>(path(owner), {
      action: "apply",
      expectedRevisionId,
      changes,
      note,
    }),
  restore: (
    owner: LegacyAssetOwner,
    expectedRevisionId: string | null,
    revisionId: string,
  ) =>
    request<{ revisionId: string }>(path(owner), {
      action: "restore",
      expectedRevisionId,
      revisionId,
    }),
  mode: (
    owner: LegacyAssetOwner,
    expectedRevisionId: string | null,
    mode: "local" | "r2",
  ) =>
    request<{ revisionId: string }>(path(owner), {
      action: "mode",
      expectedRevisionId,
      mode,
    }),
  runtime: (owner: LegacyAssetOwner) =>
    request<LegacyAssetRuntime>(
      `/api/legacy-template-assets/${owner.ownerKind}/${owner.templateId}`,
    ),
  async upload(
    owner: LegacyAssetOwner,
    assetId: string,
    file: File,
  ): Promise<LegacyAssetVersion> {
    if (!file.size || file.size > MAX_LEGACY_ASSET_BYTES)
      throw new Error("최대 32MB 이미지만 업로드할 수 있습니다.");
    const hash = await crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    const contentHash = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const signed = await request<{
      uploadUrl: string;
      ticket: string;
      headers: Record<string, string>;
    }>(path(owner), {
      action: "presign",
      upload: {
        assetId,
        contentHash,
        mimeType: file.type,
        byteSize: file.size,
        originalFilename: file.name,
      },
    });
    const uploaded = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: signed.headers,
      body: file,
      credentials: "omit",
    });
    if (!uploaded.ok)
      throw new Error("R2 업로드에 실패했습니다. CORS 설정을 확인해 주세요.");
    return (
      await request<{ version: LegacyAssetVersion }>(path(owner), {
        action: "verify",
        ticket: signed.ticket,
      })
    ).version;
  },
};
