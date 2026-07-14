import type {
  StudioAssetId,
  StudioTemplateDocument,
  StudioTimetableGuideResource,
} from "@/types/template-studio";

export const STUDIO_TIMETABLE_GUIDE_DEFAULT_OPACITY = 0.5;

export interface ResolvedStudioTimetableGuide {
  assetId: StudioAssetId | null;
  visible: boolean;
  opacity: number;
}

type StudioGuideResourceKey = "cardsGuide" | "timetableGuide";

export function normalizeStudioTimetableGuideOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return STUDIO_TIMETABLE_GUIDE_DEFAULT_OPACITY;
  }

  return Math.min(1, Math.max(0, value));
}

function getStudioGuide(
  document: Pick<StudioTemplateDocument, "resources">,
  resourceKey: StudioGuideResourceKey,
): ResolvedStudioTimetableGuide {
  const guide = document.resources?.[resourceKey];
  const assetId = guide?.assetId ?? null;

  return {
    assetId,
    visible: Boolean(assetId) && (guide?.visible ?? true),
    opacity: normalizeStudioTimetableGuideOpacity(guide?.opacity),
  };
}

function setStudioGuideResource(
  document: StudioTemplateDocument,
  resourceKey: StudioGuideResourceKey,
  guide: StudioTimetableGuideResource,
) {
  document.resources = {
    ...document.resources,
    [resourceKey]: guide,
  };
}

function setStudioGuideAsset(
  document: StudioTemplateDocument,
  resourceKey: StudioGuideResourceKey,
  assetId: StudioAssetId | null,
) {
  const currentGuide = getStudioGuide(document, resourceKey);

  setStudioGuideResource(document, resourceKey, {
    assetId,
    visible: Boolean(assetId),
    opacity: currentGuide.opacity,
  });
}

function setStudioGuideVisibility(
  document: StudioTemplateDocument,
  resourceKey: StudioGuideResourceKey,
  visible: boolean,
) {
  const currentGuide = getStudioGuide(document, resourceKey);

  setStudioGuideResource(document, resourceKey, {
    ...currentGuide,
    visible: Boolean(currentGuide.assetId) && visible,
  });
}

function setStudioGuideOpacity(
  document: StudioTemplateDocument,
  resourceKey: StudioGuideResourceKey,
  opacity: number,
) {
  const currentGuide = getStudioGuide(document, resourceKey);

  setStudioGuideResource(document, resourceKey, {
    ...currentGuide,
    opacity: normalizeStudioTimetableGuideOpacity(opacity),
  });
}

export function getStudioCardsGuide(
  document: Pick<StudioTemplateDocument, "resources">,
): ResolvedStudioTimetableGuide {
  return getStudioGuide(document, "cardsGuide");
}

export function getStudioTimetableGuide(
  document: Pick<StudioTemplateDocument, "resources">,
): ResolvedStudioTimetableGuide {
  return getStudioGuide(document, "timetableGuide");
}

export function setStudioCardsGuideAsset(
  document: StudioTemplateDocument,
  assetId: StudioAssetId | null,
) {
  setStudioGuideAsset(document, "cardsGuide", assetId);
}

export function setStudioCardsGuideVisibility(
  document: StudioTemplateDocument,
  visible: boolean,
) {
  setStudioGuideVisibility(document, "cardsGuide", visible);
}

export function setStudioCardsGuideOpacity(
  document: StudioTemplateDocument,
  opacity: number,
) {
  setStudioGuideOpacity(document, "cardsGuide", opacity);
}

export function setStudioTimetableGuideAsset(
  document: StudioTemplateDocument,
  assetId: StudioAssetId | null,
) {
  setStudioGuideAsset(document, "timetableGuide", assetId);
}

export function setStudioTimetableGuideVisibility(
  document: StudioTemplateDocument,
  visible: boolean,
) {
  setStudioGuideVisibility(document, "timetableGuide", visible);
}

export function setStudioTimetableGuideOpacity(
  document: StudioTemplateDocument,
  opacity: number,
) {
  setStudioGuideOpacity(document, "timetableGuide", opacity);
}
