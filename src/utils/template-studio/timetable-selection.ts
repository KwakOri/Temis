import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDayDefinition,
  StudioTimetableDayId,
} from "@/types/template-studio";
import { getStudioBindingInputId } from "@/utils/template-studio/binding-resolver";
import { getStudioBuiltinField } from "@/utils/template-studio/builtin-fields";
import { resolveStudioTimetableDayComponent } from "@/utils/template-studio/component-sets";
import {
  isStudioFillParentLayout,
  isStudioPlacedTimetableCompositionObject,
} from "@/utils/template-studio/object-layout";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "@/utils/template-studio/timetable-graph-presets";
import {
  resolveStudioTimetableLayerTarget,
  type StudioTimetableLayerTarget,
} from "@/utils/template-studio/timetable-commands";
import type { StudioAssetSlotKind } from "@/utils/template-studio/timetable-asset-slot-specs";
import type { StudioDateFormatMode } from "@/utils/template-studio/date-template";
import { getStudioBindingFormatFeatures } from "@/utils/template-studio/binding-format";
import { resolveStudioTimetableDayVariantStatus } from "@/utils/template-studio/entry-groups";
import { resolveStudioTimetableComponentVariant } from "@/utils/template-studio/timetable-runtime";

/** 요일 인스턴스에서 실제로 렌더 중인 카드 디자인으로 이동할 대상. */
export const resolveStudioTimetableDayCardEditorTarget = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
) => {
  if (!document.domains?.timetable?.days[dayId]) return null;
  const component = resolveStudioTimetableDayComponent(document, dayId);
  const variant = resolveStudioTimetableComponentVariant(
    document,
    component?.component,
    resolveStudioTimetableDayVariantStatus(document, values, dayId),
  );
  if (
    !component ||
    !variant ||
    !document.graph.nodes[variant.variant.rootNodeId]
  )
    return null;
  return {
    componentId: component.componentId,
    statusId: variant.resolvedStatusId,
    rootNodeId: variant.variant.rootNodeId,
  };
};

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

/** 저장 형식을 바꾸지 않고 요소·역할을 공통 편집 기능으로 해석한다. */
export interface StudioTimetableEditorFeatures {
  resizable: boolean;
  dateFormatMode: StudioDateFormatMode | null;
  dayLabelFormat: boolean;
  timeFormat: boolean;
  assetSlots: StudioAssetSlotKind[];
  mask: boolean;
  assetLayout: boolean;
  runtimeMode: boolean;
}

export const getStudioTimetableEditorFeatures = (
  object: StudioTimetableCompositionObject | null,
): StudioTimetableEditorFeatures => {
  const isPreset = (key: string) =>
    isStudioTimetableObjectOfPreset(object, key);
  const bindingFeatures = getStudioBindingFormatFeatures(object?.binding);
  const isText = object?.kind === "text" || object?.kind === "flexibleText";
  const isLeaf = object && object.kind !== "group";
  const legacyProfile =
    isPreset("profileBlock") && object?.kind === "profileBlock";
  const assetSlots: StudioAssetSlotKind[] = [];
  if (isLeaf && isPreset("weeklyMemo")) assetSlots.push("background");
  if (legacyProfile) assetSlots.push("profileImage", "profileFrame");
  if (object?.kind === "image" && object.profileRole)
    assetSlots.push("profileChild");
  if (object?.kind === "image" && object.structuredRole === "background")
    assetSlots.push("structuredBackground");
  if (isLeaf && isPreset("artistProfileText"))
    assetSlots.push("artistProfileText");
  if (isLeaf && isPreset("topObject")) assetSlots.push("topObject");
  if (isPreset("board")) assetSlots.push("board");

  return {
    resizable: isStudioPlacedTimetableCompositionObject(object ?? undefined),
    dateFormatMode: isText ? bindingFeatures.dateFormatMode : null,
    dayLabelFormat: isText && bindingFeatures.dayLabelFormat,
    timeFormat: isText && bindingFeatures.timeFormat,
    assetSlots,
    mask:
      legacyProfile ||
      (object?.kind === "image" && object.profileRole === "userImage"),
    assetLayout: Boolean(isLeaf && isPreset("artistProfileText")),
    // 기존 제품 정책을 유지한다. 일반 상태 모델과 허용 정책은 별개다.
    runtimeMode: Boolean(object?.variantSet && isPreset("topObject")),
  };
};

/** Authoring choices belong to the editor view, outside document/history. */
export type StudioTimetableEditingVariants = Record<string, string>;

export const getStudioTimetableEditingVariantValue = (
  object: Pick<StudioTimetableCompositionObject, "id" | "variantSet">,
  editingVariants: StudioTimetableEditingVariants = {},
): string | null => {
  const variants = object.variantSet;
  if (!variants) return null;
  if (variants.mode === "always")
    return variants.options.some((option) => option.value === "on")
      ? "on"
      : variants.defaultValue;
  const selected = editingVariants[object.id];
  return variants.options.some((option) => option.value === selected)
    ? selected
    : variants.defaultValue;
};

export interface StudioTimetableEditingState {
  owner: StudioTimetableCompositionObject;
  value: string;
  label: string;
}

/** 자식을 골라도 가장 가까운 상태 소유자를 찾는다. 잘못된 순환은 중단한다. */
export const resolveStudioTimetableEditingState = (
  composition: StudioTimetableComposition,
  object: StudioTimetableCompositionObject | null,
  editingVariants: StudioTimetableEditingVariants = {},
): StudioTimetableEditingState | null => {
  const visited = new Set<string>();
  let current = object;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.variantSet) {
      const value = getStudioTimetableEditingVariantValue(
        current,
        editingVariants,
      )!;
      return {
        owner: current,
        value,
        label:
          current.variantSet.options.find((option) => option.value === value)
            ?.label ?? value,
      };
    }
    current = current.parentId
      ? (composition.objects[current.parentId] ?? null)
      : null;
  }
  return null;
};

/** 시간표 레이어를 고른 결과. 인스펙터가 무엇을 보여줄지 여기서 정해진다. */
export interface StudioTimetableSelection {
  target: StudioTimetableLayerTarget | null;
  features: StudioTimetableEditorFeatures;
  editingState: StudioTimetableEditingState | null;
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
  isFitParent: boolean;
  /** 요일 카드 묶음을 골랐는지. */
  isDayCards: boolean;
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
  editingVariants: StudioTimetableEditingVariants = {},
): StudioTimetableSelection => {
  const object = selectedLayerId
    ? (composition.objects[selectedLayerId] ?? null)
    : null;

  const target = selectedLayerId
    ? resolveStudioTimetableLayerTarget(selectedLayerId)
    : null;
  const dayId = target?.kind === "dayCard" ? target.dayId : null;

  const textObject =
    object?.kind === "text" || object?.kind === "flexibleText" ? object : null;
  const bindingInputId = textObject
    ? getStudioBindingInputId(textObject.binding)
    : null;

  return {
    target,
    features: getStudioTimetableEditorFeatures(object),
    editingState: resolveStudioTimetableEditingState(
      composition,
      object,
      editingVariants,
    ),
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
    isFitParent: isStudioFillParentLayout(object?.layoutMode),
    isDayCards: selectedLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
  };
};
