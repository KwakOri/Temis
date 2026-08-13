import type {
  StudioAssetId,
  StudioTemplateDocument,
  StudioThumbnailGuide,
} from "@/types/template-studio";

export const THUMBNAIL_STUDIO_GUIDE_DEFAULT_OPACITY = 0.5;

export interface ResolvedThumbnailStudioGuide {
  assetId: StudioAssetId | null;
  visible: boolean;
  opacity: number;
}

export const normalizeThumbnailStudioGuideOpacity = (
  value: unknown,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return THUMBNAIL_STUDIO_GUIDE_DEFAULT_OPACITY;
  }

  return Math.min(1, Math.max(0, value));
};

const normalizeThumbnailStudioGuideAssetId = (
  assetId: unknown,
): StudioAssetId | null =>
  typeof assetId === "string" && assetId.trim().length > 0
    ? assetId.trim()
    : null;

export const getThumbnailStudioGuide = (
  document: Pick<StudioTemplateDocument, "domains">,
): ResolvedThumbnailStudioGuide => {
  const guide = document.domains?.thumbnail?.guide;
  const assetId = normalizeThumbnailStudioGuideAssetId(guide?.assetId);

  return {
    assetId,
    visible: Boolean(assetId) && Boolean(guide?.visible ?? true),
    opacity: normalizeThumbnailStudioGuideOpacity(guide?.opacity),
  };
};

export const setThumbnailStudioGuide = (
  document: StudioTemplateDocument,
  guide: StudioThumbnailGuide,
): void => {
  const assetId = normalizeThumbnailStudioGuideAssetId(guide.assetId);
  document.domains = {
    ...(document.domains ?? {}),
    thumbnail: {
      ...(document.domains?.thumbnail ?? {
        version: 1,
        export: {
          defaultFormat: "png",
          transparentBackground: false,
        },
      }),
      guide: {
        ...guide,
        assetId,
        visible: Boolean(assetId) && Boolean(guide.visible ?? true),
        opacity: normalizeThumbnailStudioGuideOpacity(guide.opacity),
      },
    },
  };
};

export const setThumbnailStudioGuideAsset = (
  document: StudioTemplateDocument,
  assetId: StudioAssetId | null,
): void => {
  const currentGuide = getThumbnailStudioGuide(document);
  setThumbnailStudioGuide(document, {
    assetId,
    visible: Boolean(assetId),
    opacity: currentGuide.opacity,
  });
};

export const setThumbnailStudioGuideVisibility = (
  document: StudioTemplateDocument,
  visible: boolean,
): void => {
  const currentGuide = getThumbnailStudioGuide(document);
  setThumbnailStudioGuide(document, {
    ...currentGuide,
    visible: Boolean(currentGuide.assetId) && visible,
  });
};

export const setThumbnailStudioGuideOpacity = (
  document: StudioTemplateDocument,
  opacity: number,
): void => {
  const currentGuide = getThumbnailStudioGuide(document);
  setThumbnailStudioGuide(document, {
    ...currentGuide,
    opacity: normalizeThumbnailStudioGuideOpacity(opacity),
  });
};
