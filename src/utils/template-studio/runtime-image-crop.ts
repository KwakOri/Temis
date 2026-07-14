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
