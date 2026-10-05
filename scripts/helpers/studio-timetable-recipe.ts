/** Test-only synthetic composition fixtures. Never imported by application code. */
import {
  StudioInputId,
  StudioTemplateDocument,
  StudioRuntimeValues,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDomain,
  StudioTimetableObjectPresetId,
} from "../../src/types/template-studio";
import { getStudioRuntimeInputValue } from "../../src/utils/template-studio/input-values";
import {
  createStudioSemanticAssetSlot,
  createStudioTimetableEditableSlots,
  createStudioSemanticVisibilitySlot,
} from "../../src/utils/template-studio/semantic-slots";

export const STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID = "day-cards";
const STUDIO_PROFILE_BLOCK_SIZE = 420;
const STUDIO_ARTIST_WIDTH = 1200;
const STUDIO_ARTIST_HEIGHT = 180;
const STUDIO_WEEKLY_MEMO_WIDTH = 1500;
const STUDIO_WEEKLY_MEMO_HEIGHT = 110;

const createStudioTimetableDayCardsExceptionMeta = () => ({
  semanticKey: "dayCardContainers" as const,
  scope: "timetable" as const,
  presetId: "dayCards",
  lockedStructure: true,
  singleton: true,
  builtInBindings: {
    dayLabel: "day.short_label" as const,
    dayDate: "day.date" as const,
    statusLabel: "entry.status_label" as const,
  },
});

const createStudioWeekDatesExceptionMeta = () => ({
  semanticKey: "weekDates" as const,
  scope: "timetable" as const,
  presetId: "weekDates",
  lockedStructure: true,
  singleton: false,
  builtInBindings: {
    text: "week.date_range" as const,
  },
});

const createStudioProfileBlockGroupExceptionMeta = (visible = true) => ({
  semanticKey: "profileBlock" as const,
  scope: "timetable" as const,
  presetId: "profileBlock",
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioTimetableEditableSlots({
    visibility: createStudioSemanticVisibilitySlot(visible),
  }),
});

const createStudioStructuredGroupExceptionMeta = (
  presetId: "weeklyMemo" | "artistProfileText",
  visible = true,
) => ({
  semanticKey: presetId,
  scope: "timetable" as const,
  presetId,
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioTimetableEditableSlots({
    visibility: createStudioSemanticVisibilitySlot(visible),
  }),
});

const createStudioBoardExceptionMeta = (
  assetId?: StudioTimetableCompositionObject["backgroundAssetId"],
  fit: StudioTimetableCompositionObject["backgroundFit"] = "cover",
  visible = true,
) => ({
  semanticKey: "board" as const,
  scope: "timetable" as const,
  presetId: "board",
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioTimetableEditableSlots({
    asset: createStudioSemanticAssetSlot({ assetId, fit }),
    visibility: createStudioSemanticVisibilitySlot(visible),
  }),
});

export const createStudioTimetableDayCardsObject =
  (): StudioTimetableCompositionObject => ({
    id: STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
    kind: "generatedDayCards",
    label: "Day Card Containers",
    presetId: "dayCards",
    style: { opacity: 1, rotateDeg: 0 },
    meta: {
      exception: createStudioTimetableDayCardsExceptionMeta(),
    },
  });

const STUDIO_TIMETABLE_ON_OFF_VARIANT_OPTIONS = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

const createStudioTimetableOnOffVariantSet = (
  onRootId: string,
  offRootId: string,
  inputId?: StudioInputId,
): StudioTimetableCompositionObject["variantSet"] => ({
  options: STUDIO_TIMETABLE_ON_OFF_VARIANT_OPTIONS,
  defaultValue: "on",
  inputId,
  rootByValue: {
    on: onRootId,
    off: offRootId,
  },
});

const normalizeStudioTimetableVariantSet = (
  variantSet: StudioTimetableCompositionObject["variantSet"],
): StudioTimetableCompositionObject["variantSet"] => {
  if (!variantSet) return undefined;

  const options =
    Array.isArray(variantSet.options) && variantSet.options.length > 0
      ? variantSet.options
      : STUDIO_TIMETABLE_ON_OFF_VARIANT_OPTIONS;
  const optionValues = new Set(options.map((option) => option.value));
  const defaultValue = optionValues.has(variantSet.defaultValue)
    ? variantSet.defaultValue
    : (options[0]?.value ?? "on");
  return {
    ...variantSet,
    options,
    defaultValue,
    rootByValue: { ...(variantSet.rootByValue ?? {}) },
  };
};

export const getStudioTimetableObjectRenderableChildIds = (
  object: StudioTimetableCompositionObject,
  variantValue?: string | null,
) => {
  const variantSet = normalizeStudioTimetableVariantSet(object.variantSet);
  if (!variantSet) return object.childIds ?? [];

  const resolvedValue =
    variantValue &&
    variantSet.options.some((option) => option.value === variantValue)
      ? variantValue
      : variantSet.defaultValue;
  const activeVariantRootId = variantSet.rootByValue[resolvedValue] ?? null;

  if (activeVariantRootId) return [activeVariantRootId];
  return [];
};

export const getStudioTimetableObjectRuntimeVariantValue = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableCompositionObject,
) => {
  const variantSet = normalizeStudioTimetableVariantSet(object.variantSet);
  if (!variantSet) return null;

  if (variantSet.mode === "always") {
    return variantSet.options.some((option) => option.value === "on")
      ? "on"
      : variantSet.defaultValue;
  }

  const input = variantSet.inputId
    ? document.inputs[variantSet.inputId]
    : undefined;
  const runtimeValue = input
    ? getStudioRuntimeInputValue(input, runtimeValues)
    : variantSet.defaultValue;

  return variantSet.options.some((option) => option.value === runtimeValue)
    ? runtimeValue
    : variantSet.defaultValue;
};

const getStudioProfileBlockChildIds = (groupId: string) => ({
  backPlateId: `${groupId}:back-plate-object`,
  userImageId: `${groupId}:user-image-object`,
  frameId: `${groupId}:frame-object`,
});

const getStudioVariantStateGroupIds = (groupId: string) => ({
  onGroupId: `${groupId}:on`,
  offGroupId: `${groupId}:off`,
});

const getStudioStructuredTextChildIds = (groupId: string) => ({
  backgroundId: `${groupId}:background-object`,
  textId: `${groupId}:text-object`,
});

const cloneStudioTimetableCompositionObject = (
  object: StudioTimetableCompositionObject,
): StudioTimetableCompositionObject =>
  JSON.parse(JSON.stringify(object)) as StudioTimetableCompositionObject;

const createStudioVariantStateGroup = (
  id: string,
  label: string,
  parentId: string,
  childIds: string[],
  width: number,
  height: number,
  hidden = false,
): StudioTimetableCompositionObject => ({
  id,
  kind: "group",
  label,
  parentId,
  childIds,
  hidden,
  layoutMode: "fillParent",
  style: {
    position: "absolute",
    left: 0,
    top: 0,
    width,
    height,
    rotateDeg: 0,
    opacity: 1,
    overflow: "visible",
  },
});

const createDefaultStudioTimetableComposition =
  (): StudioTimetableComposition => ({
    rootObjectIds: [STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID],
    objects: {
      [STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID]:
        createStudioTimetableDayCardsObject(),
    },
  });

/** Documents are normalized by migrations at load/import, never by readers. */
export const getStudioTimetableComposition = (
  timetable?: StudioTimetableDomain,
): StudioTimetableComposition =>
  timetable?.composition ?? createDefaultStudioTimetableComposition();

const getUniqueTimetableObjectId = (
  objectIds: Iterable<string>,
  baseId: string,
) => {
  const existingObjectIds = new Set(objectIds);
  let suffix = 1;
  let objectId = baseId;

  while (existingObjectIds.has(objectId)) {
    suffix += 1;
    objectId = `${baseId}-${suffix}`;
  }

  return { objectId, suffix };
};

export const createStudioProfileBlockPresetObjects = (
  composition: StudioTimetableComposition,
  options: {
    inputId: StudioInputId;
    backPlateAssetId?: string;
    frameAssetId?: string;
  },
) => {
  const { objectId, suffix } = getUniqueTimetableObjectId(
    Object.keys(composition.objects),
    "profile-block",
  );
  const label = suffix === 1 ? "Profile Block" : `Profile Block ${suffix}`;
  const { backPlateId, userImageId, frameId } =
    getStudioProfileBlockChildIds(objectId);
  const commonChildStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width: STUDIO_PROFILE_BLOCK_SIZE,
    height: STUDIO_PROFILE_BLOCK_SIZE,
    rotateDeg: 0,
    opacity: 1,
  };
  const group: StudioTimetableCompositionObject = {
    id: objectId,
    kind: "group",
    label,
    presetId: "profileBlock",
    parentId: null,
    childIds: [backPlateId, userImageId, frameId],
    style: {
      position: "absolute",
      left: 360,
      top: 470,
      width: STUDIO_PROFILE_BLOCK_SIZE,
      height: STUDIO_PROFILE_BLOCK_SIZE,
      rotateDeg: 0,
      opacity: 1,
      overflow: "visible",
    },
    meta: {
      exception: createStudioProfileBlockGroupExceptionMeta(),
    },
  };
  const children: StudioTimetableCompositionObject[] = [
    {
      id: backPlateId,
      kind: "image",
      label: "back_plate_object",
      parentId: objectId,
      profileRole: "backPlate",
      style: commonChildStyle,
      assetSlots: options.backPlateAssetId
        ? {
            asset: {
              assetId: options.backPlateAssetId,
              fit: "contain",
            },
          }
        : undefined,
    },
    {
      id: userImageId,
      kind: "image",
      label: "user_image_object",
      parentId: objectId,
      profileRole: "userImage",
      style: {
        ...commonChildStyle,
        borderRadius: 0,
        overflow: "hidden",
      },
      assetSlots: {
        asset: {
          inputId: options.inputId,
          fit: "cover",
        },
      },
    },
    {
      id: frameId,
      kind: "image",
      label: "frame_object",
      parentId: objectId,
      profileRole: "frame",
      style: commonChildStyle,
      assetSlots: options.frameAssetId
        ? {
            asset: {
              assetId: options.frameAssetId,
              fit: "contain",
            },
          }
        : undefined,
    },
  ];

  return { group, children };
};

export const createStudioStructuredTextPresetObjects = (
  presetId: "weeklyMemo" | "artistProfileText",
  composition: StudioTimetableComposition,
  options: {
    inputId?: StudioInputId;
    backgroundAssetId?: string;
    variantInputId?: StudioInputId;
  } = {},
) => {
  const isWeeklyMemo = presetId === "weeklyMemo";
  const baseId = isWeeklyMemo ? "weekly-memo" : "artist-profile-text";
  const { objectId, suffix } = getUniqueTimetableObjectId(
    Object.keys(composition.objects),
    baseId,
  );
  const baseLabel = isWeeklyMemo ? "Weekly Memo" : "Artist";
  const label = suffix === 1 ? baseLabel : `${baseLabel} ${suffix}`;
  const width = isWeeklyMemo ? STUDIO_WEEKLY_MEMO_WIDTH : STUDIO_ARTIST_WIDTH;
  const height = isWeeklyMemo
    ? STUDIO_WEEKLY_MEMO_HEIGHT
    : STUDIO_ARTIST_HEIGHT;
  const { onGroupId, offGroupId } = getStudioVariantStateGroupIds(objectId);
  const onChildIds = getStudioStructuredTextChildIds(onGroupId);
  const offChildIds = getStudioStructuredTextChildIds(offGroupId);
  const commonChildStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width,
    height,
    rotateDeg: 0,
    opacity: 1,
  };
  const group: StudioTimetableCompositionObject = {
    id: objectId,
    kind: "group",
    label,
    presetId,
    parentId: null,
    childIds: [onGroupId, offGroupId],
    variantSet: createStudioTimetableOnOffVariantSet(
      onGroupId,
      offGroupId,
      options.variantInputId,
    ),
    style: {
      position: "absolute",
      left: isWeeklyMemo ? 360 : 840,
      top: isWeeklyMemo ? 1770 : 470,
      width,
      height,
      rotateDeg: 0,
      opacity: 1,
      overflow: "visible",
    },
    meta: {
      exception: createStudioStructuredGroupExceptionMeta(presetId),
    },
  };
  const onGroup = createStudioVariantStateGroup(
    onGroupId,
    `${baseLabel} On`,
    objectId,
    [onChildIds.backgroundId, onChildIds.textId],
    width,
    height,
  );
  const offGroup = createStudioVariantStateGroup(
    offGroupId,
    `${baseLabel} Off`,
    objectId,
    [offChildIds.backgroundId, offChildIds.textId],
    width,
    height,
    true,
  );
  const background: StudioTimetableCompositionObject = {
    id: onChildIds.backgroundId,
    kind: "image",
    label: isWeeklyMemo
      ? "weekly_memo_background_object"
      : "artist_background_object",
    parentId: onGroupId,
    structuredRole: "background",
    layoutMode: "fillParent",
    style: commonChildStyle,
    assetSlots: options.backgroundAssetId
      ? {
          asset: {
            assetId: options.backgroundAssetId,
            fit: "cover",
          },
        }
      : undefined,
  };
  const textObject: StudioTimetableCompositionObject = {
    id: onChildIds.textId,
    // 구조화 텍스트 프리셋은 박스 안에서 자동 리사이즈되는 Auto Text를 쓴다.
    kind: "flexibleText",
    label: isWeeklyMemo ? "weekly_memo_text_object" : "artist_text_object",
    parentId: onGroupId,
    structuredRole: "text",
    layoutMode: "fillParent",
    style: {
      ...commonChildStyle,
      color: isWeeklyMemo ? "#475569" : "#172033",
      display: "flex",
      alignItems: "center",
      fontSize: isWeeklyMemo ? 48 : 64,
      fontWeight: isWeeklyMemo ? 700 : 800,
      lineHeight: isWeeklyMemo ? 1.2 : 1.12,
    },
    binding: options.inputId
      ? {
          kind: "inputText",
          inputId: options.inputId,
        }
      : {
          kind: "staticText",
          value: isWeeklyMemo ? "Weekly memo" : "Artist",
        },
  };
  const offBackground: StudioTimetableCompositionObject = {
    ...cloneStudioTimetableCompositionObject(background),
    id: offChildIds.backgroundId,
    label: isWeeklyMemo
      ? "weekly_memo_off_background_object"
      : "artist_off_background_object",
    parentId: offGroupId,
  };
  const offTextObject: StudioTimetableCompositionObject = {
    ...cloneStudioTimetableCompositionObject(textObject),
    id: offChildIds.textId,
    label: isWeeklyMemo
      ? "weekly_memo_off_text_object"
      : "artist_off_text_object",
    parentId: offGroupId,
  };

  return {
    group,
    children: [
      onGroup,
      background,
      textObject,
      offGroup,
      offBackground,
      offTextObject,
    ],
  };
};

export const getStudioTimetablePresetLabel = (
  presetId: StudioTimetableObjectPresetId,
) => {
  if (presetId === "board") return "Board";
  if (presetId === "weekDates") return "Week Dates";
  if (presetId === "weeklyMemo") return "Weekly Memo";
  if (presetId === "profileBlock") return "Profile Block";
  if (presetId === "artistProfileText") return "Artist";
  if (presetId === "topObject") return "Top Object";
  return "Day Card Containers";
};

/**
 * 단일 오브젝트 하나로 삽입되는 프리셋.
 *
 * 나머지 프리셋은 그룹 + 자식 묶음(bundle)으로 만들어져야 한다:
 * `Weekly Memo`/`Artist`는 `createStudioStructuredTextPresetObjects`,
 * `Profile Block`은 `createStudioProfileBlockPresetObjects`,
 * 여기에 구조화 프리셋을 다시 허용하면 "구조화 텍스트는 항상 Auto Text"라는
 * 불변식이 깨지므로 타입으로 막는다.
 */
export type StudioSingleObjectPresetId = "dayCards" | "board" | "weekDates";

export const createStudioTimetablePresetObject = (
  presetId: StudioSingleObjectPresetId,
  composition: StudioTimetableComposition,
  options: {
    inputId?: StudioInputId;
    assetId?: StudioTimetableCompositionObject["backgroundAssetId"];
  } = {},
): StudioTimetableCompositionObject => {
  if (presetId === "dayCards") return createStudioTimetableDayCardsObject();

  const baseId = presetId === "board" ? "board" : "week-dates";
  const { objectId, suffix } = getUniqueTimetableObjectId(
    Object.keys(composition.objects),
    baseId,
  );
  const baseLabel = getStudioTimetablePresetLabel(presetId);
  const label = suffix === 1 ? baseLabel : `${baseLabel} ${suffix}`;

  if (presetId === "board") {
    return {
      id: objectId,
      kind: "image",
      label,
      presetId,
      parentId: null,
      layoutMode: "fillParent",
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 4000,
        height: 2250,
        opacity: 1,
        overflow: "hidden",
      },
      assetSlots: {
        asset: {
          assetId: options.assetId,
          fit: "cover",
        },
      },
      meta: {
        exception: createStudioBoardExceptionMeta(options.assetId),
      },
    };
  }

  if (presetId === "weekDates") {
    return {
      id: objectId,
      kind: "text",
      label,
      presetId,
      style: {
        position: "absolute",
        left: 360,
        top: 250,
        width: 1500,
        height: 120,
        color: "#172033",
        display: "flex",
        alignItems: "center",
        fontSize: 86,
        fontWeight: 800,
        opacity: 1,
      },
      binding: {
        kind: "builtinField",
        fieldId: "week.date_range",
      },
      meta: {
        exception: createStudioWeekDatesExceptionMeta(),
      },
    };
  }

  const unsupportedPresetId: never = presetId;
  throw new Error(
    `createStudioTimetablePresetObject does not create ${String(
      unsupportedPresetId,
    )}; use the dedicated bundle creator instead.`,
  );
};

