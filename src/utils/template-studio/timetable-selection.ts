import type {
  StudioInputDefinition,
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDayDefinition,
  StudioTimetableDayId,
  StudioTimetableObjectVariantSet,
} from "@/types/template-studio";
import { getStudioBindingInputId } from "@/utils/template-studio/binding-resolver";
import { getStudioBuiltinField } from "@/utils/template-studio/builtin-fields";
import { resolveStudioTimetableDayComponent } from "@/utils/template-studio/component-sets";
import { isStudioFillParentLayout } from "@/utils/template-studio/object-layout";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "@/utils/template-studio/timetable-composition";

/** 요일 카드 레이어 id의 머리말. 카드는 composition object가 아니라 요일을 가리킨다. */
const STUDIO_DAY_CARD_LAYER_PREFIX = "day-card:";

/**
 * 객체가 어떤 프리셋인지 본다.
 *
 * 예전 문서는 `presetId`에 종류를 적었고 지금은 예외 meta의 `semanticKey`에
 * 적는다. 둘 중 하나만 보면 한쪽 문서에서 인스펙터가 비어 보인다.
 */
export const isStudioTimetableObjectOfPreset = (
  object: StudioTimetableCompositionObject | null | undefined,
  presetKey: string,
): boolean =>
  object?.presetId === presetKey ||
  object?.meta?.exception?.semanticKey === presetKey;

/** 시간표 레이어를 고른 결과. 인스펙터가 무엇을 보여줄지 여기서 정해진다. */
export interface StudioTimetableSelection {
  /** 고른 composition object. 요일 카드를 골랐으면 없다. */
  object: StudioTimetableCompositionObject | null;
  /** 요일 카드를 골랐을 때의 요일 id. */
  dayId: StudioTimetableDayId | null;
  day: StudioTimetableDayDefinition | null;
  /** 요일에 어떤 Component Set이 붙는지. */
  dayComponentResolution: ReturnType<
    typeof resolveStudioTimetableDayComponent
  > | null;
  /** 글자 객체일 때만 채운다. */
  textObject: StudioTimetableCompositionObject | null;
  /** 글자가 묶인 사용자 입력. */
  boundInput: StudioInputDefinition | null;
  /** 글자가 묶인 기본 필드. */
  builtinField: ReturnType<typeof getStudioBuiltinField> | null;
  /** 편집 칸에 보여줄 글자. 묶이지 않았을 때만 쓴다. */
  textValue: string;
  variantSet: StudioTimetableObjectVariantSet | null;
  isFitParent: boolean;
  /** 요일 카드 묶음을 골랐는지. */
  isDayCards: boolean;
  isWeekDates: boolean;
  isWeeklyMemo: boolean;
  /** 예전 구조의 프로필 묶음. 자식 객체 없이 한 덩어리로 되어 있다. */
  isLegacyProfileBlock: boolean;
  isProfileChild: boolean;
  isStructuredBackground: boolean;
  isArtistProfileText: boolean;
  isTopObject: boolean;
  isBoard: boolean;
}

/**
 * 고른 시간표 레이어에서 인스펙터가 쓰는 값을 모두 계산한다.
 *
 * 요일 카드 레이어는 composition object가 아니라 요일을 가리킨다. 그래서 id의
 * 머리말로 갈라 읽는다.
 */
export const resolveStudioTimetableSelection = (
  document: StudioTemplateDocument,
  composition: StudioTimetableComposition,
  selectedLayerId: string | null,
): StudioTimetableSelection => {
  const object = selectedLayerId
    ? (composition.objects[selectedLayerId] ?? null)
    : null;

  const dayId = selectedLayerId?.startsWith(STUDIO_DAY_CARD_LAYER_PREFIX)
    ? (selectedLayerId.slice(
        STUDIO_DAY_CARD_LAYER_PREFIX.length,
      ) as StudioTimetableDayId)
    : null;

  const textObject =
    object?.kind === "text" || object?.kind === "flexibleText" ? object : null;
  const bindingInputId = textObject
    ? getStudioBindingInputId(textObject.binding)
    : null;

  return {
    object,
    dayId,
    day: dayId ? (document.domains?.timetable?.days[dayId] ?? null) : null,
    dayComponentResolution: dayId
      ? resolveStudioTimetableDayComponent(document, dayId)
      : null,
    textObject,
    boundInput: bindingInputId
      ? (document.inputs[bindingInputId] ?? null)
      : null,
    builtinField:
      textObject?.binding?.kind === "builtinField"
        ? getStudioBuiltinField(textObject.binding.fieldId)
        : null,
    // 묶이지 않은 글자는 정적 값을 쓰고, 그것도 없으면 레이어 이름을 보여준다.
    textValue:
      textObject?.binding?.kind === "staticText"
        ? textObject.binding.value
        : (textObject?.label ?? ""),
    variantSet: object?.variantSet ?? null,
    isFitParent: isStudioFillParentLayout(object?.layoutMode),
    isDayCards: selectedLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
    isWeekDates: isStudioTimetableObjectOfPreset(object, "weekDates"),
    isWeeklyMemo: isStudioTimetableObjectOfPreset(object, "weeklyMemo"),
    isLegacyProfileBlock:
      isStudioTimetableObjectOfPreset(object, "profileBlock") &&
      object?.kind === "profileBlock",
    isProfileChild: object?.kind === "image" && Boolean(object.profileRole),
    isStructuredBackground:
      object?.kind === "image" && object.structuredRole === "background",
    isArtistProfileText: isStudioTimetableObjectOfPreset(
      object,
      "artistProfileText",
    ),
    isTopObject: isStudioTimetableObjectOfPreset(object, "topObject"),
    isBoard: isStudioTimetableObjectOfPreset(object, "board"),
  };
};
