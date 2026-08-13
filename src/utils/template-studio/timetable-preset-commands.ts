import type {
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import type { StudioTimetableCompositionPreset } from "@/utils/template-studio/preset-registry";
import {
  ensureStudioArtistProfileTextInput,
  ensureStudioPresetImageInput,
  ensureStudioTimetableVariantInput,
  ensureStudioWeeklyMemoInput,
  isStudioTimetableVariantInputCompatible,
  STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
} from "@/utils/template-studio/preset-inputs";
import { setStudioTimetableObjectAssetInputSlot } from "@/utils/template-studio/semantic-slots";
import {
  bindStudioArtistProfileTextObjectToInput,
  bindStudioWeeklyMemoObjectToInput,
  createStudioProfileBlockPresetObjects,
  createStudioStructuredTextPresetObjects,
  createStudioTimetablePresetObject,
  createStudioTopObjectPresetObjects,
  ensureStudioTimetableComposition,
} from "@/utils/template-studio/timetable-composition";

/** variant 입력을 쓰는 프리셋. 상태에 따라 다른 자식을 보여준다. */
const VARIANT_INPUT_PRESET_IDS = [
  "weeklyMemo",
  "artistProfileText",
  "topObject",
] as const;

/** 텍스트 입력을 쓰는 프리셋. */
const STRUCTURED_TEXT_PRESET_IDS = ["weeklyMemo", "artistProfileText"] as const;

type StudioTimetablePresetId =
  StudioTimetableCompositionPreset["timetableObjectPresetId"];

const usesVariantInput = (
  presetId: StudioTimetablePresetId,
): presetId is (typeof VARIANT_INPUT_PRESET_IDS)[number] =>
  (VARIANT_INPUT_PRESET_IDS as readonly string[]).includes(presetId);

const usesStructuredTextInput = (
  presetId: StudioTimetablePresetId,
): presetId is (typeof STRUCTURED_TEXT_PRESET_IDS)[number] =>
  (STRUCTURED_TEXT_PRESET_IDS as readonly string[]).includes(presetId);

/**
 * 그룹 안에서 구조화된 텍스트 객체를 찾는다.
 *
 * 프리셋이 만든 그룹은 텍스트를 자손으로 두므로 너비 우선으로 내려가며 찾는다.
 */
export const findStudioTimetableStructuredTextObject = (
  composition: StudioTimetableComposition,
  rootObject: StudioTimetableCompositionObject | undefined,
): StudioTimetableCompositionObject | null => {
  if (!rootObject) return null;

  const visitedObjectIds = new Set<string>();
  const queue = [...(rootObject.childIds ?? [])];

  while (queue.length > 0) {
    const objectId = queue.shift();
    if (!objectId || visitedObjectIds.has(objectId)) continue;
    visitedObjectIds.add(objectId);

    const object = composition.objects[objectId];
    if (!object) continue;

    if (
      object.structuredRole === "text" &&
      (object.kind === "text" || object.kind === "flexibleText")
    ) {
      return object;
    }

    queue.push(...(object.childIds ?? []));
  }

  return null;
};

/** 라벨이나 id에 주어진 낱말이 들어간 첫 에셋. */
const findStudioAssetIdByKeywords = (
  document: StudioTemplateDocument,
  keywords: string[],
): string | undefined =>
  Object.values(document.assets).find((asset) => {
    const searchable = `${asset.id} ${asset.label}`.toLowerCase();
    return keywords.some((keyword) => searchable.includes(keyword));
  })?.id;

/**
 * 이미 놓인 singleton 프리셋을 입력에 다시 연결한다.
 *
 * 프리셋을 다시 누르면 새로 만들지 않고 기존 객체를 고르는데, 그때 입력 연결이
 * 끊어져 있으면 이어 붙인다. 연결을 새로 만들었으면 true를 준다.
 *
 * 추출 전에는 프리셋 종류마다 문서 변경을 따로 호출해서 한 번의 조작이 이력에
 * 여러 단계로 쌓였다. 이제 한 번에 처리한다.
 */
export const relinkStudioTimetablePresetInput = (
  draft: StudioTemplateDocument,
  preset: StudioTimetableCompositionPreset,
  existingObjectId: string,
): boolean => {
  const timetable = draft.domains?.timetable;
  if (!timetable) return false;

  const composition = ensureStudioTimetableComposition(timetable);
  const presetId = preset.timetableObjectPresetId;
  let linked = false;

  if (usesVariantInput(presetId)) {
    const rootObject = composition.objects[existingObjectId];
    if (
      rootObject?.variantSet &&
      !isStudioTimetableVariantInputCompatible(
        draft,
        rootObject.variantSet.inputId,
      )
    ) {
      const variantInput = ensureStudioTimetableVariantInput(draft, presetId);
      if (variantInput) {
        rootObject.variantSet.inputId = variantInput.inputId;
        linked = true;
      }
    }
  }

  if (usesStructuredTextInput(presetId)) {
    const rootObject = composition.objects[existingObjectId];
    const object =
      rootObject?.kind === "group"
        ? findStudioTimetableStructuredTextObject(composition, rootObject)
        : rootObject;

    if (object && (object.kind === "text" || object.kind === "flexibleText")) {
      const { inputId } =
        presetId === "weeklyMemo"
          ? ensureStudioWeeklyMemoInput(draft)
          : ensureStudioArtistProfileTextInput(draft);

      if (
        object.binding?.kind !== "inputText" ||
        object.binding.inputId !== inputId
      ) {
        if (presetId === "weeklyMemo") {
          bindStudioWeeklyMemoObjectToInput(object, inputId);
        } else {
          bindStudioArtistProfileTextObjectToInput(object, inputId);
        }
        linked = true;
      }
    }
  }

  if (presetId === "profileBlock") {
    const group = composition.objects[existingObjectId];
    const userImageObject = group?.childIds
      ?.map((childId) => composition.objects[childId])
      .find((child) => child?.profileRole === "userImage");

    if (userImageObject) {
      const currentSlot = userImageObject.assetSlots?.asset;
      const { inputId } = ensureStudioPresetImageInput(draft, {
        label: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
        scope: "global",
        placeholder: "Paste profile image URL",
        defaultUrl: currentSlot?.assetId
          ? (draft.assets[currentSlot.assetId]?.src ?? "")
          : "",
      });

      if (currentSlot?.inputId !== inputId) {
        setStudioTimetableObjectAssetInputSlot(
          userImageObject,
          "asset",
          inputId,
          currentSlot?.fit ?? "cover",
        );
        linked = true;
      }
    }
  }

  return linked;
};

export interface StudioTimetablePresetInsertResult {
  objectId: string;
  /** 입력을 함께 만들어 연결했는지 */
  linkedInput: boolean;
}

/**
 * 프리셋 객체를 시간표 composition에 넣는다.
 *
 * 프리셋 종류에 따라 그룹과 자식을 함께 만들고 필요한 입력을 준비한다. board는
 * 다른 객체 뒤에 깔려야 해서 루트 목록의 앞에 들어간다. 시간표 도메인이 없으면
 * null을 준다.
 */
export const insertStudioTimetablePresetObject = (
  draft: StudioTemplateDocument,
  preset: StudioTimetableCompositionPreset,
): StudioTimetablePresetInsertResult | null => {
  const timetable = draft.domains?.timetable;
  if (!timetable) return null;

  const composition = ensureStudioTimetableComposition(timetable);
  const presetId = preset.timetableObjectPresetId;

  const presetTextInput = usesStructuredTextInput(presetId)
    ? presetId === "weeklyMemo"
      ? ensureStudioWeeklyMemoInput(draft)
      : ensureStudioArtistProfileTextInput(draft)
    : null;
  const variantInput = usesVariantInput(presetId)
    ? ensureStudioTimetableVariantInput(draft, presetId)
    : null;

  const assetIds = Object.keys(draft.assets);
  const profileImageAssetId =
    findStudioAssetIdByKeywords(draft, [
      "profile",
      "avatar",
      "portrait",
      "photo",
    ]) ?? assetIds[0];
  const backPlateAssetId =
    findStudioAssetIdByKeywords(draft, [
      "back_plate",
      "back plate",
      "backplate",
      "plate",
    ]) ?? assetIds[0];
  const frameAssetId =
    findStudioAssetIdByKeywords(draft, ["frame", "border"]) ??
    assetIds[1] ??
    assetIds[0];

  const insertGroup = (
    group: StudioTimetableCompositionObject,
    children: StudioTimetableCompositionObject[],
  ) => {
    composition.objects[group.id] = group;
    children.forEach((child) => {
      composition.objects[child.id] = child;
    });
    composition.rootObjectIds.push(group.id);
  };

  if (presetId === "profileBlock") {
    const { inputId } = ensureStudioPresetImageInput(draft, {
      label: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
      scope: "global",
      placeholder: "Paste profile image URL",
      defaultUrl: profileImageAssetId
        ? (draft.assets[profileImageAssetId]?.src ?? "")
        : "",
    });
    const { group, children } = createStudioProfileBlockPresetObjects(
      composition,
      { inputId, backPlateAssetId, frameAssetId },
    );
    insertGroup(group, children);
    return { objectId: group.id, linkedInput: true };
  }

  if (usesStructuredTextInput(presetId)) {
    const { group, children } = createStudioStructuredTextPresetObjects(
      presetId,
      composition,
      {
        inputId: presetTextInput?.inputId,
        variantInputId: variantInput?.inputId,
      },
    );
    insertGroup(group, children);
    return {
      objectId: group.id,
      linkedInput: Boolean(presetTextInput || variantInput),
    };
  }

  const defaultAssetId =
    presetId === "topObject" ? (assetIds[1] ?? assetIds[0]) : undefined;

  if (presetId === "topObject") {
    const { group, children } = createStudioTopObjectPresetObjects(
      composition,
      {
        assetId: defaultAssetId,
        variantInputId: variantInput?.inputId,
      },
    );
    insertGroup(group, children);
    return { objectId: group.id, linkedInput: Boolean(variantInput) };
  }

  const object = createStudioTimetablePresetObject(presetId, composition, {
    inputId: presetTextInput?.inputId,
    assetId: defaultAssetId,
  });
  composition.objects[object.id] = object;

  if (presetId === "board") {
    composition.rootObjectIds.unshift(object.id);
  } else {
    composition.rootObjectIds.push(object.id);
  }

  return { objectId: object.id, linkedInput: Boolean(presetTextInput) };
};

export const getStudioTimetablePresetMessage = (
  label: string,
  { existing, linkedInput }: { existing: boolean; linkedInput: boolean },
): string => {
  if (existing) {
    return linkedInput
      ? `Linked ${label} to input`
      : `Selected existing ${label}`;
  }
  return linkedInput ? `Added ${label} with input` : `Added ${label}`;
};
