import type {
  StudioStyleRecord,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import {
  STUDIO_WEEK_DATE_FORMAT_PRESETS,
  STUDIO_WEEK_DATE_LONG_TEMPLATE,
} from "@/utils/template-studio/date-template";
import type { StudioSemanticMaskShape } from "@/utils/template-studio/semantic-slots";

/** style에서 글자 값을 읽는다. 숫자나 빈 값이면 대신 쓸 값을 준다. */
export const getStudioStyleString = (
  styleRecord: StudioStyleRecord,
  key: string,
  fallback: string,
): string => {
  const value = styleRecord[key];
  return typeof value === "string" ? value : fallback;
};

/** 원으로 볼 반지름의 기준. 이보다 크면 모서리가 아니라 원으로 다룬다. */
export const STUDIO_MASK_CIRCLE_RADIUS = 9999;

/** 둥근 모서리를 처음 고를 때 쓸 반지름. */
export const STUDIO_MASK_ROUNDED_RADIUS = 56;

/**
 * 반지름으로 마스크 모양을 읽는다.
 *
 * 문서에는 모양 대신 반지름만 남기므로 값으로 되돌려 읽는다.
 */
export const getStudioMaskShapeFromRadius = (
  radius: number,
): StudioSemanticMaskShape => {
  if (radius >= STUDIO_MASK_CIRCLE_RADIUS) return "circle";
  if (radius <= 0) return "rectangle";
  return "rounded";
};

/** 모양에 맞는 반지름. */
export const getStudioMaskRadiusFromShape = (
  shape: StudioSemanticMaskShape,
): number => {
  if (shape === "circle") return STUDIO_MASK_CIRCLE_RADIUS;
  if (shape === "rectangle") return 0;
  return STUDIO_MASK_ROUNDED_RADIUS;
};

/** 객체의 마스크 모양. */
export const getStudioTimetableObjectMaskShape = (
  object: StudioTimetableCompositionObject,
): StudioSemanticMaskShape =>
  getStudioMaskShapeFromRadius(
    typeof object.style.borderRadius === "number"
      ? object.style.borderRadius
      : 0,
  );

/** id로 주간 날짜 형식 프리셋을 찾는다. */
export const getStudioWeekDatePreset = (presetId: string) =>
  STUDIO_WEEK_DATE_FORMAT_PRESETS.find((preset) => preset.id === presetId) ??
  null;

/**
 * 객체가 쓰는 날짜 틀.
 *
 * 직접 적은 틀이 있으면 그것을 쓰고, 없으면 고른 프리셋의 틀을 쓴다. 둘 다
 * 없으면 기본 틀을 쓴다.
 */
export const getStudioWeekDateTemplateValue = (
  object: StudioTimetableCompositionObject,
): string => {
  const template = getStudioStyleString(object.style, "dateRangeTemplate", "");
  if (template) return template;

  const format = getStudioStyleString(object.style, "dateRangeFormat", "long");
  return (
    getStudioWeekDatePreset(format)?.template ?? STUDIO_WEEK_DATE_LONG_TEMPLATE
  );
};

/**
 * 지금 고른 날짜 형식.
 *
 * 직접 적은 틀이 프리셋과 같으면 그 프리셋으로 보여준다. 사람이 프리셋을 고른
 * 뒤 틀을 건드리지 않았는데 `custom`으로 보이면 혼란스럽기 때문이다.
 */
export const getStudioWeekDatePresetValue = (
  object: StudioTimetableCompositionObject,
): string => {
  const template = getStudioStyleString(object.style, "dateRangeTemplate", "");
  const format = getStudioStyleString(object.style, "dateRangeFormat", "long");
  if (!template && getStudioWeekDatePreset(format)) return format;

  return (
    STUDIO_WEEK_DATE_FORMAT_PRESETS.find(
      (preset) => preset.template === template,
    )?.id ?? "custom"
  );
};
