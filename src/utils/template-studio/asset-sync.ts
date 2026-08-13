import type {
  StudioAsset,
  StudioTemplateDocument,
} from "@/types/template-studio";
import type {
  TemplateStudioUploadAssetPayload,
  TemplateStudioUploadedAsset,
} from "@/services/templateStudioService";
/** `data:image/...;base64,...` 형태의 주소. 셋으로 갈라 읽는다. */
const DATA_IMAGE_URL_PATTERN = /^data:(image\/[^;,]+)((?:;[^,]+)*),([\s\S]*)$/;
const DATA_IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};
/** 문서에 사진 내용이 그대로 담겨 있는지. 담긴 채로 발행하면 문서가 커져 저장이 실패한다. */
export const isStudioDataImageSrc = (src: string): boolean =>
  DATA_IMAGE_URL_PATTERN.test(src);
export interface StudioDataImagePayload {
  buffer: ArrayBuffer;
  extension: string;
  mimeType: string;
}
const copyBytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};
/**
 * 문서에 담긴 사진 내용을 바이트로 읽는다.
 *
 * 우리가 올릴 수 있는 종류만 받는다. 종류를 모르면 확장자를 정할 수 없어 저장한
 * 뒤에 무엇으로 읽어야 하는지 알 수 없다.
 */
export const parseStudioDataImageUrl = (
  src: string,
): StudioDataImagePayload | null => {
  const match = src.match(DATA_IMAGE_URL_PATTERN);
  if (!match) return null;
  const mimeType = match[1];
  const extension = DATA_IMAGE_EXTENSION[mimeType];
  if (!extension) return null;
  const parameters = match[2]
    .split(";")
    .map((parameter) => parameter.trim().toLowerCase())
    .filter(Boolean);
  const data = match[3];
  try {
    const bytes = parameters.includes("base64")
      ? Uint8Array.from(globalThis.atob(data), (character) =>
          character.charCodeAt(0),
        )
      : new TextEncoder().encode(decodeURIComponent(data));
    if (bytes.byteLength === 0) return null;
    return { buffer: copyBytesToArrayBuffer(bytes), extension, mimeType };
  } catch {
    return null;
  }
};
const bytesToHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
export interface StudioDataImageMetadata {
  byteSize: number;
  /** 내용이 같은지 견주는 값. 계산할 수 없으면 비운다. */
  contentHash: string | null;
  mimeType: string;
}
/**
 * 문서에 담긴 사진의 크기와 내용 지문을 읽는다.
 *
 * 지문으로 이미 올린 사진과 같은지 견준다. 지문을 계산할 수 없는 환경에서는
 * 비워서 돌려주고, 그때는 다시 올린다. 같은 사진을 한 번 더 올리는 것이 바뀐
 * 사진을 안 올리는 것보다 낫다.
 */
export const getStudioDataImageMetadata = async (
  src: string,
): Promise<StudioDataImageMetadata | null> => {
  const parsed = parseStudioDataImageUrl(src);
  if (!parsed) return null;
  if (!globalThis.crypto?.subtle) {
    return {
      byteSize: parsed.buffer.byteLength,
      contentHash: null,
      mimeType: parsed.mimeType,
    };
  }
  try {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      parsed.buffer,
    );
    return {
      byteSize: parsed.buffer.byteLength,
      contentHash: bytesToHex(digest),
      mimeType: parsed.mimeType,
    };
  } catch {
    return {
      byteSize: parsed.buffer.byteLength,
      contentHash: null,
      mimeType: parsed.mimeType,
    };
  }
};
/**
 * 원격에 저장된 에셋 한 줄에서 견주는 데 쓰는 값만 본다.
 *
 * 서버 레코드 전체를 받지 않는다. 이 판단에 필요한 것은 어디에 있고 내용이
 * 무엇인지뿐이다.
 */
export interface StudioRemoteAssetSnapshot {
  assetId: string;
  storageProvider?: string | null;
  storagePath: string;
  publicUrl?: string | null;
  contentHash?: string | null;
  mimeType?: string;
  byteSize?: number | null;
  lastSyncedAt?: string | null;
}
export interface StudioAssetSyncPlan {
  /** 다시 올려야 하는 사진. */
  uploads: TemplateStudioUploadAssetPayload[];
  /** 올리지 않고 원격 값을 문서에 옮겨 적을 사진. */
  patches: TemplateStudioUploadedAsset[];
}
const createRemoteAssetPatch = (
  asset: StudioAsset,
  remoteAsset: StudioRemoteAssetSnapshot,
  remoteUrl: string,
  metadata?: StudioDataImageMetadata,
): TemplateStudioUploadedAsset => ({
  id: asset.id,
  label: asset.label,
  src: remoteUrl,
  storageProvider: "r2",
  storagePath: remoteAsset.storagePath,
  publicUrl: remoteUrl,
  contentHash: metadata?.contentHash ?? remoteAsset.contentHash ?? undefined,
  mimeType: metadata?.mimeType ?? remoteAsset.mimeType ?? "",
  byteSize: metadata?.byteSize ?? remoteAsset.byteSize ?? 0,
  uploaded: false,
  lastSyncedAt: remoteAsset.lastSyncedAt,
});
/**
 * 어떤 사진을 다시 올리고 어떤 사진은 원격 값을 그대로 쓸지 정한다.
 *
 * 내용 지문, 종류, 크기가 모두 같을 때만 다시 올리지 않는다. 셋 중 하나라도
 * 견주지 않으면 바뀐 사진이 옛 주소에 묶인 채로 남아, 사용자는 고친 사진이
 * 저장되지 않았다고 읽는다. 반대로 늘 올리면 저장이 눈에 띄게 느려진다.
 *
 * 문서에 담기지 않은 사진(이미 주소만 있는 것)은 올릴 것이 없다. 다만 그 주소가
 * 원격에 있는 것과 같다면 저장 경로와 지문을 문서에 채워 둔다. 다음 저장에서
 * 견줄 값이 없으면 매번 다시 올리게 된다.
 */
export const planStudioAssetSync = ({
  assets,
  remoteAssets,
  localMetadataByAssetId,
}: {
  assets: StudioAsset[];
  remoteAssets: StudioRemoteAssetSnapshot[];
  /** 문서에 내용이 담긴 사진의 지문. 담기지 않은 사진은 넣지 않는다. */
  localMetadataByAssetId: Record<string, StudioDataImageMetadata | null>;
}): StudioAssetSyncPlan => {
  const remoteAssetsById = new Map(
    remoteAssets.map((remoteAsset) => [remoteAsset.assetId, remoteAsset]),
  );
  const plan: StudioAssetSyncPlan = { uploads: [], patches: [] };
  assets.forEach((asset) => {
    const remoteAsset = remoteAssetsById.get(asset.id);
    const remoteUrl = remoteAsset?.publicUrl ?? null;
    if (isStudioDataImageSrc(asset.src)) {
      const metadata = localMetadataByAssetId[asset.id] ?? null;
      const canReuseRemote =
        Boolean(metadata?.contentHash) &&
        remoteAsset?.storageProvider === "r2" &&
        Boolean(remoteUrl) &&
        remoteAsset?.contentHash === metadata?.contentHash &&
        remoteAsset?.mimeType === metadata?.mimeType &&
        remoteAsset?.byteSize === metadata?.byteSize;
      if (canReuseRemote && remoteAsset && remoteUrl && metadata) {
        plan.patches.push(
          createRemoteAssetPatch(asset, remoteAsset, remoteUrl, metadata),
        );
        return;
      }
      plan.uploads.push({
        assetId: asset.id,
        label: asset.label,
        src: asset.src,
        localContentHash: metadata?.contentHash ?? undefined,
        mimeType: metadata?.mimeType,
        byteSize: metadata?.byteSize,
      });
      return;
    }
    // 이미 원격을 가리키는 사진인지 본다. 주소, 저장 경로, 지문 중 하나라도
    // 맞으면 같은 사진으로 본다. 저장한 뒤 주소만 바뀐 문서도 있다.
    const pointsToRemote =
      remoteAsset?.storageProvider === "r2" &&
      Boolean(remoteUrl) &&
      (asset.src === remoteUrl ||
        asset.publicUrl === remoteUrl ||
        asset.storagePath === remoteAsset?.storagePath ||
        Boolean(
          asset.contentHash &&
          remoteAsset?.contentHash &&
          asset.contentHash === remoteAsset.contentHash,
        ));
    if (pointsToRemote && remoteAsset && remoteUrl) {
      plan.patches.push(createRemoteAssetPatch(asset, remoteAsset, remoteUrl));
    }
  });
  return plan;
};
/**
 * 동기화 결과를 문서에 옮겨 적는다.
 *
 * 문서에 없는 에셋은 건너뛴다. 동기화 중에 지운 에셋을 되살리면 레이어에서
 * 사라진 사진이 문서에만 남는다.
 *
 * 바뀐 것이 없으면 거짓을 돌려준다. 호출한 쪽이 문서를 갈아끼우지 않도록 해서
 * 저장할 때마다 이력이 한 단계씩 늘어나는 것을 막는다.
 */
export const applyStudioSyncedAssets = (
  document: StudioTemplateDocument,
  patches: TemplateStudioUploadedAsset[],
): boolean => {
  let changed = false;
  patches.forEach((patch) => {
    const currentAsset = document.assets[patch.id];
    if (!currentAsset) return;
    document.assets[patch.id] = {
      ...currentAsset,
      src: patch.publicUrl ?? patch.src,
      storageProvider: patch.storageProvider ?? "r2",
      storagePath: patch.storagePath,
      publicUrl: patch.publicUrl ?? patch.src,
      contentHash: patch.contentHash,
      mimeType: patch.mimeType,
      byteSize: patch.byteSize,
      lastSyncedAt: patch.lastSyncedAt ?? undefined,
    };
    changed = true;
  });
  return changed;
};
