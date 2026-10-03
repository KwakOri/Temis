import {
  LEGACY_ASSET_OWNER_KINDS,
  type LegacyAssetBindings,
  type LegacyAssetChange,
  type LegacyAssetOwner,
  type LegacyAssetUpload,
} from "../../types/legacy-template-assets";

export const MAX_LEGACY_ASSET_BYTES = 32 * 1024 * 1024;
export const HASH_PATTERN = /^[a-f0-9]{64}$/;
export const UUID_PATTERN = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const LEGACY_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
export class LegacyAssetError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "LegacyAssetError";
  }
}
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function parseLegacyAssetOwner(
  ownerKind: string,
  templateId: string,
): LegacyAssetOwner {
  if (
    !LEGACY_ASSET_OWNER_KINDS.includes(
      ownerKind as LegacyAssetOwner["ownerKind"],
    ) ||
    !UUID_PATTERN.test(templateId)
  )
    throw new LegacyAssetError("유효한 템플릿 종류와 ID가 필요합니다.");
  return {
    ownerKind: ownerKind as LegacyAssetOwner["ownerKind"],
    templateId: templateId.toLowerCase(),
  };
}
export function parseLegacyAssetUpload(value: unknown): LegacyAssetUpload {
  if (
    !isRecord(value) ||
    typeof value.assetId !== "string" ||
    !HASH_PATTERN.test(value.assetId) ||
    typeof value.contentHash !== "string" ||
    !HASH_PATTERN.test(value.contentHash) ||
    typeof value.mimeType !== "string" ||
    !Object.hasOwn(LEGACY_IMAGE_EXTENSIONS, value.mimeType) ||
    typeof value.byteSize !== "number" ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize < 1 ||
    value.byteSize > MAX_LEGACY_ASSET_BYTES ||
    typeof value.originalFilename !== "string" ||
    !value.originalFilename.trim() ||
    value.originalFilename.length > 255
  )
    throw new LegacyAssetError(
      "지원하는 이미지와 올바른 파일 정보가 필요합니다. (최대 32MB)",
    );
  return value as unknown as LegacyAssetUpload;
}
export function mergeLegacyAssetChanges(
  bindings: LegacyAssetBindings,
  expectedSlots: Record<string, string[]>,
  changes: unknown,
  versions: ReadonlySet<string>,
): LegacyAssetBindings {
  if (!Array.isArray(changes) || changes.length < 1 || changes.length > 2000)
    throw new LegacyAssetError("교체할 이미지 슬롯이 필요합니다.");
  const merged = Object.fromEntries(
    Object.entries(bindings).map(([theme, slots]) => [theme, { ...slots }]),
  );
  const seen = new Set<string>();
  for (const raw of changes) {
    if (
      !isRecord(raw) ||
      typeof raw.theme !== "string" ||
      typeof raw.key !== "string" ||
      typeof raw.versionId !== "string"
    )
      throw new LegacyAssetError("슬롯 정보가 올바르지 않습니다.");
    const change = raw as unknown as LegacyAssetChange;
    const identity = JSON.stringify([change.theme, change.key]);
    if (
      !Object.hasOwn(expectedSlots, change.theme) ||
      !expectedSlots[change.theme].includes(change.key) ||
      !versions.has(change.versionId) ||
      seen.has(identity)
    )
      throw new LegacyAssetError("등록되지 않았거나 중복된 슬롯·이미지입니다.");
    seen.add(identity);
    Object.defineProperty(merged[change.theme], change.key, {
      value: change.versionId,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  validateLegacyAssetBindings(merged, expectedSlots, versions);
  return merged;
}
export function validateLegacyAssetBindings(
  bindings: LegacyAssetBindings,
  expected: Record<string, string[]>,
  versions: ReadonlySet<string>,
): void {
  if (Object.keys(bindings).length !== Object.keys(expected).length)
    throw new LegacyAssetError("테마 구성이 일치하지 않습니다.");
  for (const [theme, keys] of Object.entries(expected)) {
    const slots = Object.hasOwn(bindings, theme) ? bindings[theme] : null;
    if (
      !isRecord(slots) ||
      Object.keys(slots).length !== keys.length ||
      keys.some(
        (key) =>
          !Object.hasOwn(slots, key) || !versions.has(slots[key] as string),
      )
    )
      throw new LegacyAssetError(
        "필수 이미지 슬롯이 누락되었거나 다른 템플릿의 이미지입니다.",
      );
  }
}
export function legacyAssetStoragePath(
  owner: LegacyAssetOwner,
  environment: string,
  asset: LegacyAssetUpload,
): string {
  parseLegacyAssetOwner(owner.ownerKind, owner.templateId);
  parseLegacyAssetUpload(asset);
  if (!/^[a-z0-9_-]{1,32}$/.test(environment))
    throw new LegacyAssetError("에셋 환경 구분이 필요합니다.", 503);
  return `legacy-template-assets/${environment}/${owner.ownerKind}/${owner.templateId}/assets/${asset.assetId}/${asset.contentHash}.${LEGACY_IMAGE_EXTENSIONS[asset.mimeType]}`;
}
