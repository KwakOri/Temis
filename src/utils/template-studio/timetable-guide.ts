import type {
  StudioAssetId,
  StudioTemplateDocument,
  StudioTimetableGuideResource,
  StudioTimetableStatusId,
} from "@/types/template-studio";

export const STUDIO_TIMETABLE_GUIDE_DEFAULT_OPACITY = 0.5;

export interface ResolvedStudioTimetableGuide {
  assetId: StudioAssetId | null;
  visible: boolean;
  opacity: number;
}

/** 가이드 이미지가 붙는 자리. 시간표 전체 하나와 카드 상태마다 하나씩이다. */
export type StudioGuideTarget =
  | { kind: "timetable" }
  | { kind: "cardStatus"; statusId: StudioTimetableStatusId };

/** 이전 문서의 카드 공통 가이드를 넘겨받는 상태. */
const LEGACY_CARDS_GUIDE_STATUS_ID = "online";

export function normalizeStudioTimetableGuideOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return STUDIO_TIMETABLE_GUIDE_DEFAULT_OPACITY;
  }

  return Math.min(1, Math.max(0, value));
}

function readStudioGuideResource(
  document: Pick<StudioTemplateDocument, "resources">,
  target: StudioGuideTarget,
): StudioTimetableGuideResource | undefined {
  const resources = document.resources;
  if (target.kind === "timetable") return resources?.timetableGuide;

  return (
    resources?.cardStatusGuides?.[target.statusId] ??
    (target.statusId === LEGACY_CARDS_GUIDE_STATUS_ID
      ? resources?.cardsGuide
      : undefined)
  );
}

function writeStudioGuideResource(
  document: StudioTemplateDocument,
  target: StudioGuideTarget,
  guide: StudioTimetableGuideResource,
) {
  if (target.kind === "timetable") {
    document.resources = { ...document.resources, timetableGuide: guide };
    return;
  }

  const resources = { ...document.resources };
  // Online 가이드를 새 자리에 쓰면 넘겨받던 공통 가이드는 더 읽지 않는다.
  if (target.statusId === LEGACY_CARDS_GUIDE_STATUS_ID) {
    delete resources.cardsGuide;
  }
  document.resources = {
    ...resources,
    cardStatusGuides: {
      ...resources.cardStatusGuides,
      [target.statusId]: guide,
    },
  };
}

export function getStudioGuide(
  document: Pick<StudioTemplateDocument, "resources">,
  target: StudioGuideTarget,
): ResolvedStudioTimetableGuide {
  const guide = readStudioGuideResource(document, target);
  const assetId = guide?.assetId ?? null;

  return {
    assetId,
    visible: Boolean(assetId) && (guide?.visible ?? true),
    opacity: normalizeStudioTimetableGuideOpacity(guide?.opacity),
  };
}

export function setStudioGuideAsset(
  document: StudioTemplateDocument,
  target: StudioGuideTarget,
  assetId: StudioAssetId | null,
) {
  const currentGuide = getStudioGuide(document, target);

  writeStudioGuideResource(document, target, {
    assetId,
    visible: Boolean(assetId),
    opacity: currentGuide.opacity,
  });
}

export function setStudioGuideVisibility(
  document: StudioTemplateDocument,
  target: StudioGuideTarget,
  visible: boolean,
) {
  const currentGuide = getStudioGuide(document, target);

  writeStudioGuideResource(document, target, {
    ...currentGuide,
    visible: Boolean(currentGuide.assetId) && visible,
  });
}

export function setStudioGuideOpacity(
  document: StudioTemplateDocument,
  target: StudioGuideTarget,
  opacity: number,
) {
  const currentGuide = getStudioGuide(document, target);

  writeStudioGuideResource(document, target, {
    ...currentGuide,
    opacity: normalizeStudioTimetableGuideOpacity(opacity),
  });
}

export function getStudioCardStatusGuide(
  document: Pick<StudioTemplateDocument, "resources">,
  statusId: StudioTimetableStatusId,
): ResolvedStudioTimetableGuide {
  return getStudioGuide(document, { kind: "cardStatus", statusId });
}

export function getStudioTimetableGuide(
  document: Pick<StudioTemplateDocument, "resources">,
): ResolvedStudioTimetableGuide {
  return getStudioGuide(document, { kind: "timetable" });
}
