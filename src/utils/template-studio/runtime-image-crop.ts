import type {
  StudioInputId,
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import { resolveStudioTimetableObjectGeometry } from "@/utils/template-studio/object-layout";
import { getStudioTimetableComposition } from "@/utils/template-studio/timetable-composition";

export interface StudioRuntimeImageCropTarget {
  objectId: string;
  width: number;
  height: number;
}

const hasInputAssetSlot = (
  object: StudioTimetableCompositionObject,
  inputId: StudioInputId,
) =>
  Object.values(object.assetSlots ?? {}).some(
    (slot) => slot.inputId === inputId,
  );

const getCropTargetPriority = (object: StudioTimetableCompositionObject) => {
  if (object.profileRole === "userImage") return 0;
  if (object.presetId === "profileBlock" || object.kind === "profileBlock") {
    return 1;
  }
  return 2;
};

const isProfileImageObject = (object: StudioTimetableCompositionObject) =>
  object.profileRole === "userImage" ||
  object.presetId === "profileBlock" ||
  object.kind === "profileBlock";

export const getStudioRuntimeProfileImageCropTarget = (
  document: StudioTemplateDocument,
  inputId: StudioInputId,
): StudioRuntimeImageCropTarget | null => {
  const timetable = document.domains?.timetable;
  if (!timetable) return null;

  const composition = getStudioTimetableComposition(timetable);
  const object = Object.values(composition.objects)
    .filter(
      (candidate) =>
        isProfileImageObject(candidate) &&
        hasInputAssetSlot(candidate, inputId),
    )
    .sort(
      (left, right) =>
        getCropTargetPriority(left) - getCropTargetPriority(right),
    )[0];
  if (!object) return null;

  const geometry = resolveStudioTimetableObjectGeometry(
    composition,
    object.id,
    {
      width: timetable.canvas?.width ?? document.canvas.width,
      height: timetable.canvas?.height ?? document.canvas.height,
    },
  );
  if (geometry.width <= 0 || geometry.height <= 0) return null;

  return {
    objectId: object.id,
    width: geometry.width,
    height: geometry.height,
  };
};

/** 어디에 넣을 사진인지 모를 때 쓰는 자르기 크기. */
export const STUDIO_RUNTIME_FALLBACK_CROP_SIZE = { width: 400, height: 400 };

/**
 * 미리보기용 사진을 자를 창의 크기를 정한다.
 *
 * 지금 고른 객체의 크기를 따라간다. 템플릿이 정한 자리와 다른 비율로 자르면
 * 미리보기가 실제 결과와 달라진다. 고른 것이 없을 때만 정사각으로 연다.
 */
export const resolveStudioRuntimeCropSize = (
  selectedGeometry: { width: number; height: number } | null | undefined,
): { width: number; height: number } =>
  selectedGeometry ?? STUDIO_RUNTIME_FALLBACK_CROP_SIZE;
