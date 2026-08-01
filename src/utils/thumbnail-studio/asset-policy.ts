import type { StudioAsset } from "@/types/template-studio";
import { createStudioId } from "@/utils/template-studio/id";

export const THUMBNAIL_STUDIO_ASSET_ACCEPT = "image/png,image/jpeg,image/webp";
export const THUMBNAIL_STUDIO_ASSET_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_THUMBNAIL_ASSET_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export interface ThumbnailStudioAssetFileLike {
  name: string;
  type: string;
  size: number;
}

export interface ThumbnailStudioImageDimensions {
  width: number;
  height: number;
}

export interface ThumbnailStudioAssetImportFailure {
  fileName: string;
  reason: string;
}

export interface ThumbnailStudioAssetImportResult {
  assets: StudioAsset[];
  failures: ThumbnailStudioAssetImportFailure[];
}

export const validateThumbnailStudioAssetFile = (
  file: ThumbnailStudioAssetFileLike,
): string | null => {
  if (!ALLOWED_THUMBNAIL_ASSET_MIME_TYPES.has(file.type)) {
    return "Only PNG, JPEG, and WebP images are supported.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "The image file is empty.";
  }
  if (file.size > THUMBNAIL_STUDIO_ASSET_MAX_BYTES) {
    return "The image exceeds the 10 MiB limit.";
  }
  return null;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("The image file could not be read."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The image file did not produce a data URL."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });

const decodeImageDimensions = (
  src: string,
): Promise<ThumbnailStudioImageDimensions> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("The image could not be decoded."));
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("The image has invalid dimensions."));
        return;
      }
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = src;
  });

const getAssetLabelFromFileName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "").trim();
  return withoutExtension || "Imported image";
};

export const createThumbnailStudioLocalAsset = ({
  file,
  src,
  dimensions,
  usedAssetIds,
}: {
  file: ThumbnailStudioAssetFileLike;
  src: string;
  dimensions: ThumbnailStudioImageDimensions;
  usedAssetIds: Set<string>;
}): StudioAsset => {
  let id = createStudioId("asset");
  while (usedAssetIds.has(id)) id = createStudioId("asset");
  usedAssetIds.add(id);

  return {
    id,
    label: getAssetLabelFromFileName(file.name),
    src,
    width: dimensions.width,
    height: dimensions.height,
    mimeType: file.type,
    byteSize: file.size,
  };
};

/** 브라우저에서 읽고 decode까지 끝난 local asset만 돌려준다. */
export const importThumbnailStudioAssetFiles = async (
  files: readonly File[],
  existingAssetIds: readonly string[],
): Promise<ThumbnailStudioAssetImportResult> => {
  const usedAssetIds = new Set(existingAssetIds);
  const assets: StudioAsset[] = [];
  const failures: ThumbnailStudioAssetImportFailure[] = [];

  for (const file of files) {
    const validationError = validateThumbnailStudioAssetFile(file);
    if (validationError) {
      failures.push({ fileName: file.name, reason: validationError });
      continue;
    }

    try {
      const src = await readFileAsDataUrl(file);
      if (!src.startsWith(`data:${file.type};`)) {
        throw new Error("The image MIME type did not match its data URL.");
      }
      const dimensions = await decodeImageDimensions(src);
      assets.push(
        createThumbnailStudioLocalAsset({
          file,
          src,
          dimensions,
          usedAssetIds,
        }),
      );
    } catch (error) {
      failures.push({
        fileName: file.name,
        reason:
          error instanceof Error ? error.message : "The image import failed.",
      });
    }
  }

  return { assets, failures };
};

export const getThumbnailStudioAssetStorageStatus = (
  asset: StudioAsset,
): "local" | "remote" =>
  asset.src.startsWith("data:image/") && !asset.storagePath
    ? "local"
    : "remote";
