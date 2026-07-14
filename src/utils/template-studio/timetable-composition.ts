import {
  StudioInputId,
  StudioTimetableAssetSlot,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDomain,
  StudioTimetableObjectPresetId,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioRuntimeInputValue } from "@/utils/template-studio/input-values";
import {
  createStudioSemanticAssetSlot,
  createStudioSemanticImageInputSlot,
  createStudioSemanticMaskSlot,
  createStudioSemanticSlotRecord,
  createStudioSemanticTextInputSlot,
  createStudioSemanticVisibilitySlot,
  type StudioSemanticMaskShape,
} from "@/utils/template-studio/semantic-slots";

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

const createStudioWeeklyMemoEditableSlots = (
  inputId?: StudioInputId,
  backgroundAssetId?: StudioTimetableCompositionObject["backgroundAssetId"],
  backgroundFit?: StudioTimetableCompositionObject["backgroundFit"],
  visible = true,
) =>
  createStudioSemanticSlotRecord({
    text: createStudioSemanticTextInputSlot({
      inputId,
      scope: "global",
    }),
    background: createStudioSemanticAssetSlot({
      assetId: backgroundAssetId,
      fit: backgroundFit ?? "cover",
    }),
    visibility: createStudioSemanticVisibilitySlot(visible),
  });

const createStudioWeeklyMemoExceptionMeta = (
  inputId?: StudioInputId,
  backgroundAssetId?: StudioTimetableCompositionObject["backgroundAssetId"],
  backgroundFit?: StudioTimetableCompositionObject["backgroundFit"],
  visible = true,
) => ({
  semanticKey: "weeklyMemo" as const,
  scope: "timetable" as const,
  presetId: "weeklyMemo",
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioWeeklyMemoEditableSlots(
    inputId,
    backgroundAssetId,
    backgroundFit,
    visible,
  ),
});

const createStudioProfileBlockExceptionMeta = (
  assetId?: StudioTimetableCompositionObject["backgroundAssetId"],
  fit: StudioTimetableCompositionObject["backgroundFit"] = "cover",
  visible = true,
  frameAssetId?: StudioTimetableCompositionObject["backgroundAssetId"],
  frameFit: StudioTimetableCompositionObject["backgroundFit"] = "contain",
  maskRadius = 56,
  maskShape: StudioSemanticMaskShape = "rounded",
) => ({
  semanticKey: "profileBlock" as const,
  scope: "timetable" as const,
  presetId: "profileBlock",
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioSemanticSlotRecord({
    profileImage: createStudioSemanticAssetSlot({
      assetId,
      fit,
    }),
    profileFrame: createStudioSemanticAssetSlot({
      assetId: frameAssetId,
      fit: frameFit,
    }),
    mask: createStudioSemanticMaskSlot({
      shape: maskShape,
      radius: maskRadius,
    }),
    visibility: createStudioSemanticVisibilitySlot(visible),
  }),
});

const createStudioProfileBlockGroupExceptionMeta = (visible = true) => ({
  semanticKey: "profileBlock" as const,
  scope: "timetable" as const,
  presetId: "profileBlock",
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioSemanticSlotRecord({
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
  editableSlots: createStudioSemanticSlotRecord({
    visibility: createStudioSemanticVisibilitySlot(visible),
  }),
});

const createStudioArtistProfileTextExceptionMeta = (
  inputId?: StudioInputId,
  visible = true,
  assetSlot?: StudioTimetableAssetSlot,
) => ({
  semanticKey: "artistProfileText" as const,
  scope: "timetable" as const,
  presetId: "artistProfileText",
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioSemanticSlotRecord({
    text: createStudioSemanticTextInputSlot({
      inputId,
      scope: "global",
    }),
    asset: assetSlot?.inputId
      ? createStudioSemanticImageInputSlot({
          inputId: assetSlot.inputId,
          fit: assetSlot.fit ?? "contain",
        })
      : createStudioSemanticAssetSlot({
          assetId: assetSlot?.assetId,
          fit: assetSlot?.fit ?? "contain",
        }),
    visibility: createStudioSemanticVisibilitySlot(visible),
  }),
});

const createStudioTopObjectExceptionMeta = (
  assetId?: StudioTimetableCompositionObject["backgroundAssetId"],
  fit: StudioTimetableCompositionObject["backgroundFit"] = "contain",
  visible = true,
) => ({
  semanticKey: "topObject" as const,
  scope: "timetable" as const,
  presetId: "topObject",
  lockedStructure: true,
  singleton: true,
  editableSlots: createStudioSemanticSlotRecord({
    asset: createStudioSemanticAssetSlot({
      assetId,
      fit,
    }),
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
  editableSlots: createStudioSemanticSlotRecord({
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
  activeValue = "on",
  inputId?: StudioInputId,
): StudioTimetableCompositionObject["variantSet"] => ({
  options: STUDIO_TIMETABLE_ON_OFF_VARIANT_OPTIONS,
  defaultValue: "on",
  activeValue,
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
    : options[0]?.value ?? "on";
  const activeValue =
    variantSet.activeValue && optionValues.has(variantSet.activeValue)
      ? variantSet.activeValue
      : defaultValue;

  return {
    ...variantSet,
    options,
    defaultValue,
    activeValue,
    rootByValue: { ...(variantSet.rootByValue ?? {}) },
  };
};

export const getStudioTimetableObjectActiveVariantValue = (
  object: StudioTimetableCompositionObject,
) => {
  const variantSet = normalizeStudioTimetableVariantSet(object.variantSet);
  return variantSet?.activeValue ?? null;
};

export const getStudioTimetableObjectActiveVariantRootId = (
  object: StudioTimetableCompositionObject,
) => {
  const variantSet = normalizeStudioTimetableVariantSet(object.variantSet);
  if (!variantSet) return null;

  return (
    variantSet.rootByValue[variantSet.activeValue ?? variantSet.defaultValue] ??
    null
  );
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
      : variantSet.activeValue ?? variantSet.defaultValue;
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

export const setStudioTimetableObjectActiveVariantValue = (
  object: StudioTimetableCompositionObject,
  value: string,
) => {
  const variantSet = normalizeStudioTimetableVariantSet(object.variantSet);
  if (
    !variantSet ||
    !variantSet.options.some((option) => option.value === value)
  ) {
    return;
  }

  object.variantSet = {
    ...variantSet,
    activeValue: value,
  };
};

const inferStudioTimetableObjectPresetId = (
  object: StudioTimetableCompositionObject,
): StudioTimetableObjectPresetId | null => {
  if (object.presetId) return object.presetId;
  if (object.parentId) return null;
  if (object.id === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) return "dayCards";
  if (object.id.startsWith("board")) return "board";
  if (object.id.startsWith("week-dates")) return "weekDates";
  if (object.id.startsWith("weekly-memo")) return "weeklyMemo";
  if (object.id.startsWith("profile-block")) return "profileBlock";
  if (object.id.startsWith("artist-profile-text")) {
    return "artistProfileText";
  }
  if (object.id.startsWith("top-object")) return "topObject";
  return null;
};

export const normalizeStudioTimetableCompositionObject = (
  object: StudioTimetableCompositionObject,
): StudioTimetableCompositionObject => {
  const presetId = inferStudioTimetableObjectPresetId(object);

  if (presetId === "dayCards") {
    return {
      ...createStudioTimetableDayCardsObject(),
      ...object,
      presetId,
      meta: {
        ...object.meta,
        exception:
          object.meta?.exception ??
          createStudioTimetableDayCardsExceptionMeta(),
      },
    };
  }

  if (presetId === "weekDates" && object.kind === "text") {
    const exceptionMeta =
      object.meta?.exception ?? createStudioWeekDatesExceptionMeta();

    return {
      ...object,
      presetId,
      binding: {
        kind: "builtinField",
        fieldId: "week.date_range",
      },
      meta: {
        ...object.meta,
        exception: {
          ...exceptionMeta,
          singleton: false,
        },
      },
    };
  }

  if (presetId === "board" && object.kind === "image") {
    const assetSlot = object.assetSlots?.asset;

    return {
      ...object,
      presetId,
      meta: {
        ...object.meta,
        exception:
          object.meta?.exception ??
          createStudioBoardExceptionMeta(
            assetSlot?.assetId,
            assetSlot?.fit ?? "cover",
            !object.hidden,
          ),
      },
    };
  }

  if (presetId === "weeklyMemo" && object.kind === "text") {
    const inputId =
      object.binding?.kind === "inputText" ? object.binding.inputId : undefined;

    return {
      ...object,
      presetId,
      meta: {
        ...object.meta,
        exception:
          object.meta?.exception ??
          createStudioWeeklyMemoExceptionMeta(
            inputId,
            object.backgroundAssetId,
            object.backgroundFit,
            !object.hidden,
          ),
      },
    };
  }

  if (presetId === "profileBlock" && object.kind === "profileBlock") {
    const profileImageSlot = object.assetSlots?.profileImage;
    const profileFrameSlot = object.assetSlots?.profileFrame;
    const maskRadius =
      typeof object.style.borderRadius === "number"
        ? object.style.borderRadius
        : 56;
    const maskShape =
      maskRadius >= 9999
        ? "circle"
        : maskRadius <= 0
          ? "rectangle"
          : "rounded";

    return {
      ...object,
      presetId,
      meta: {
        ...object.meta,
        exception:
          object.meta?.exception ??
          createStudioProfileBlockExceptionMeta(
            profileImageSlot?.assetId,
            profileImageSlot?.fit ?? "cover",
            !object.hidden,
            profileFrameSlot?.assetId,
            profileFrameSlot?.fit ?? "contain",
            maskRadius,
            maskShape,
          ),
      },
    };
  }

  if (presetId === "artistProfileText" && object.kind === "text") {
    const inputId =
      object.binding?.kind === "inputText" ? object.binding.inputId : undefined;
    const assetSlot = object.assetSlots?.asset;

    return {
      ...object,
      presetId,
      meta: {
        ...object.meta,
        exception:
          object.meta?.exception ??
          createStudioArtistProfileTextExceptionMeta(
            inputId,
            !object.hidden,
            assetSlot,
          ),
      },
    };
  }

  if (presetId === "topObject" && object.kind === "topObject") {
    const assetSlot = object.assetSlots?.asset;

    return {
      ...object,
      presetId,
      meta: {
        ...object.meta,
        exception:
          object.meta?.exception ??
          createStudioTopObjectExceptionMeta(
            assetSlot?.assetId,
            assetSlot?.fit ?? "contain",
            !object.hidden,
          ),
      },
    };
  }

  return object;
};

const getStudioProfileBlockChildIds = (groupId: string) => ({
  backPlateId: `${groupId}:back-plate-object`,
  userImageId: `${groupId}:user-image-object`,
  frameId: `${groupId}:frame-object`,
});

const createStudioProfileBlockGroupFromLegacyObject = (
  object: StudioTimetableCompositionObject,
) => {
  const { backPlateId, userImageId, frameId } =
    getStudioProfileBlockChildIds(object.id);
  const geometry = getStudioTimetableCompositionObjectGeometry(object);
  const profileImageSlot = object.assetSlots?.profileImage;
  const profileFrameSlot = object.assetSlots?.profileFrame;
  const maskRadius =
    typeof object.style.borderRadius === "number"
      ? object.style.borderRadius
      : 56;
  const commonChildStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width: geometry.width,
    height: geometry.height,
    rotateDeg: 0,
    opacity: 1,
  };

  const group: StudioTimetableCompositionObject = {
    ...object,
    kind: "group",
    presetId: "profileBlock",
    parentId: object.parentId ?? null,
    childIds: [backPlateId, userImageId, frameId],
    style: {
      ...object.style,
      borderRadius: 0,
      opacity: object.style.opacity ?? 1,
      overflow: "visible",
    },
    assetSlots: undefined,
    backgroundAssetId: undefined,
    backgroundFit: undefined,
    meta: {
      ...object.meta,
      exception: createStudioProfileBlockGroupExceptionMeta(!object.hidden),
    },
  };
  const backPlate: StudioTimetableCompositionObject = {
    id: backPlateId,
    kind: "image",
    label: "back_plate_object",
    parentId: object.id,
    profileRole: "backPlate",
    style: {
      ...commonChildStyle,
      backgroundColor: object.style.backgroundColor,
    },
    assetSlots: object.backgroundAssetId
      ? {
          asset: {
            assetId: object.backgroundAssetId,
            fit: object.backgroundFit ?? "contain",
          },
        }
      : undefined,
  };
  const userImage: StudioTimetableCompositionObject = {
    id: userImageId,
    kind: "image",
    label: "user_image_object",
    parentId: object.id,
    profileRole: "userImage",
    style: {
      ...commonChildStyle,
      borderRadius: maskRadius,
      overflow: "hidden",
    },
    assetSlots: profileImageSlot
      ? { asset: { ...profileImageSlot } }
      : undefined,
  };
  const frame: StudioTimetableCompositionObject = {
    id: frameId,
    kind: "image",
    label: "frame_object",
    parentId: object.id,
    profileRole: "frame",
    style: commonChildStyle,
    assetSlots: profileFrameSlot
      ? { asset: { ...profileFrameSlot } }
      : undefined,
  };

  return { group, children: [backPlate, userImage, frame] };
};

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

const createStudioStructuredTextGroupFromLegacyObject = (
  object: StudioTimetableCompositionObject,
  presetId: "weeklyMemo" | "artistProfileText",
) => {
  const { onGroupId, offGroupId } = getStudioVariantStateGroupIds(object.id);
  const { backgroundId, textId } = getStudioStructuredTextChildIds(onGroupId);
  const offChildIds = getStudioStructuredTextChildIds(offGroupId);
  const geometry = getStudioTimetableCompositionObjectGeometry(object);
  const legacyAssetSlot =
    presetId === "artistProfileText"
      ? object.assetSlots?.asset
      : object.backgroundAssetId
        ? {
            assetId: object.backgroundAssetId,
            fit: object.backgroundFit ?? "cover",
          }
        : undefined;
  const commonChildStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width: geometry.width,
    height: geometry.height,
    rotateDeg: 0,
    opacity: 1,
  };
  const group: StudioTimetableCompositionObject = {
    ...object,
    kind: "group",
    label: presetId === "artistProfileText" ? "Artist" : "Weekly Memo",
    presetId,
    parentId: object.parentId ?? null,
    childIds: [onGroupId, offGroupId],
    variantSet: createStudioTimetableOnOffVariantSet(onGroupId, offGroupId),
    style: {
      position: "absolute",
      left: geometry.left,
      top: geometry.top,
      width: geometry.width,
      height: geometry.height,
      rotateDeg:
        typeof object.style.rotateDeg === "number" ? object.style.rotateDeg : 0,
      opacity: object.style.opacity ?? 1,
      overflow: "visible",
    },
    binding: undefined,
    assetSlots: undefined,
    backgroundAssetId: undefined,
    backgroundFit: undefined,
    meta: {
      ...object.meta,
      exception: createStudioStructuredGroupExceptionMeta(
        presetId,
        !object.hidden,
      ),
    },
  };
  const onGroup = createStudioVariantStateGroup(
    onGroupId,
    `${group.label} On`,
    object.id,
    [backgroundId, textId],
    geometry.width,
    geometry.height,
  );
  const offGroup = createStudioVariantStateGroup(
    offGroupId,
    `${group.label} Off`,
    object.id,
    [offChildIds.backgroundId, offChildIds.textId],
    geometry.width,
    geometry.height,
    true,
  );
  const background: StudioTimetableCompositionObject = {
    id: backgroundId,
    kind: "image",
    label:
      presetId === "artistProfileText"
        ? "artist_background_object"
        : "weekly_memo_background_object",
    parentId: onGroupId,
    structuredRole: "background",
    layoutMode: "fillParent",
    style: {
      ...commonChildStyle,
      backgroundColor: object.style.backgroundColor,
    },
    assetSlots: legacyAssetSlot
      ? { asset: { ...legacyAssetSlot } }
      : undefined,
  };
  const text: StudioTimetableCompositionObject = {
    id: textId,
    kind: presetId === "weeklyMemo" ? "flexibleText" : "text",
    label:
      presetId === "artistProfileText"
        ? "artist_text_object"
        : "weekly_memo_text_object",
    parentId: onGroupId,
    structuredRole: "text",
    layoutMode: "fillParent",
    style: {
      ...object.style,
      ...commonChildStyle,
      backgroundColor: undefined,
      assetMode: undefined,
      assetPosition: undefined,
      assetSize: undefined,
      assetGap: undefined,
    },
    binding: object.binding,
  };
  const offBackground: StudioTimetableCompositionObject = {
    ...cloneStudioTimetableCompositionObject(background),
    id: offChildIds.backgroundId,
    label:
      presetId === "artistProfileText"
        ? "artist_off_background_object"
        : "weekly_memo_off_background_object",
    parentId: offGroupId,
  };
  const offText: StudioTimetableCompositionObject = {
    ...cloneStudioTimetableCompositionObject(text),
    id: offChildIds.textId,
    label:
      presetId === "artistProfileText"
        ? "artist_off_text_object"
        : "weekly_memo_off_text_object",
    parentId: offGroupId,
  };

  return {
    group,
    children: [onGroup, background, text, offGroup, offBackground, offText],
  };
};

const createStudioStructuredTextVariantGroupFromFlatGroup = (
  object: StudioTimetableCompositionObject,
  objects: StudioTimetableComposition["objects"],
  presetId: "weeklyMemo" | "artistProfileText",
) => {
  const { onGroupId, offGroupId } = getStudioVariantStateGroupIds(object.id);
  const geometry = getStudioTimetableCompositionObjectGeometry(object);
  const sourceChildIds = object.childIds ?? [];
  const sourceChildren = sourceChildIds
    .map((childId) => objects[childId])
    .filter(Boolean);
  const offStructuredIds = getStudioStructuredTextChildIds(offGroupId);
  const getOffChildId = (child: StudioTimetableCompositionObject) => {
    if (child.structuredRole === "background") {
      return offStructuredIds.backgroundId;
    }
    if (child.structuredRole === "text") return offStructuredIds.textId;
    return `${offGroupId}:${child.id.split(":").pop() ?? child.id}`;
  };
  const offChildIds = sourceChildren.map(getOffChildId);
  const group: StudioTimetableCompositionObject = {
    ...object,
    kind: "group",
    presetId,
    parentId: object.parentId ?? null,
    childIds: [onGroupId, offGroupId],
    variantSet: createStudioTimetableOnOffVariantSet(onGroupId, offGroupId),
    style: {
      ...object.style,
      opacity: object.style.opacity ?? 1,
      overflow: "visible",
    },
    meta: {
      ...object.meta,
      exception: createStudioStructuredGroupExceptionMeta(
        presetId,
        !object.hidden,
      ),
    },
  };
  const onGroup = createStudioVariantStateGroup(
    onGroupId,
    `${group.label} On`,
    object.id,
    sourceChildIds,
    geometry.width,
    geometry.height,
  );
  const offGroup = createStudioVariantStateGroup(
    offGroupId,
    `${group.label} Off`,
    object.id,
    offChildIds,
    geometry.width,
    geometry.height,
    true,
  );
  const onChildren = sourceChildren.map((child) => ({
    ...child,
    parentId: onGroupId,
  }));
  const offChildren = sourceChildren.map((child, index) => ({
    ...cloneStudioTimetableCompositionObject(child),
    id: offChildIds[index],
    label: `${child.label}_off`,
    parentId: offGroupId,
  }));

  return {
    group,
    children: [onGroup, ...onChildren, offGroup, ...offChildren],
  };
};

const getStudioTopObjectImageIds = (groupId: string) => ({
  imageId: `${groupId}:image-object`,
});

const createStudioTopObjectGroupFromLegacyObject = (
  object: StudioTimetableCompositionObject,
) => {
  const { onGroupId, offGroupId } = getStudioVariantStateGroupIds(object.id);
  const onImageIds = getStudioTopObjectImageIds(onGroupId);
  const offImageIds = getStudioTopObjectImageIds(offGroupId);
  const geometry = getStudioTimetableCompositionObjectGeometry(object);
  const assetSlot = object.assetSlots?.asset;
  const commonChildStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width: geometry.width,
    height: geometry.height,
    rotateDeg: 0,
    opacity: 1,
    borderRadius: object.style.borderRadius,
    overflow: object.style.overflow,
  };
  const group: StudioTimetableCompositionObject = {
    ...object,
    kind: "group",
    presetId: "topObject",
    parentId: object.parentId ?? null,
    childIds: [onGroupId, offGroupId],
    variantSet: createStudioTimetableOnOffVariantSet(onGroupId, offGroupId),
    style: {
      position: "absolute",
      left: geometry.left,
      top: geometry.top,
      width: geometry.width,
      height: geometry.height,
      rotateDeg:
        typeof object.style.rotateDeg === "number" ? object.style.rotateDeg : 0,
      opacity: object.style.opacity ?? 1,
      overflow: "visible",
    },
    assetSlots: undefined,
    meta: {
      ...object.meta,
      exception: createStudioTopObjectExceptionMeta(
        assetSlot?.assetId,
        assetSlot?.fit ?? "contain",
        !object.hidden,
      ),
    },
  };
  const onGroup = createStudioVariantStateGroup(
    onGroupId,
    `${group.label} On`,
    object.id,
    [onImageIds.imageId],
    geometry.width,
    geometry.height,
  );
  const offGroup = createStudioVariantStateGroup(
    offGroupId,
    `${group.label} Off`,
    object.id,
    [offImageIds.imageId],
    geometry.width,
    geometry.height,
    true,
  );
  const image: StudioTimetableCompositionObject = {
    id: onImageIds.imageId,
    kind: "image",
    label: "top_object",
    presetId: "topObject",
    parentId: onGroupId,
    layoutMode: "fillParent",
    style: commonChildStyle,
    assetSlots: assetSlot ? { asset: { ...assetSlot } } : undefined,
  };
  const offImage: StudioTimetableCompositionObject = {
    ...cloneStudioTimetableCompositionObject(image),
    id: offImageIds.imageId,
    label: "top_object_off",
    parentId: offGroupId,
  };

  return { group, children: [onGroup, image, offGroup, offImage] };
};

const normalizeStudioTimetableComposition = (
  composition?: StudioTimetableComposition,
): StudioTimetableComposition => {
  const objects: StudioTimetableComposition["objects"] = Object.fromEntries(
    Object.entries(composition?.objects ?? {}).map(([objectId, object]) => {
      const normalizedObject = normalizeStudioTimetableCompositionObject(object);
      return [
        objectId,
        {
          ...normalizedObject,
          variantSet: normalizeStudioTimetableVariantSet(
            normalizedObject.variantSet,
          ),
          style: {
            opacity: 1,
            ...normalizedObject.style,
          },
        },
      ];
    }),
  );

  Object.entries(objects).forEach(([objectId, object]) => {
    let converted:
      | ReturnType<typeof createStudioProfileBlockGroupFromLegacyObject>
      | ReturnType<typeof createStudioStructuredTextGroupFromLegacyObject>
      | ReturnType<typeof createStudioStructuredTextVariantGroupFromFlatGroup>
      | ReturnType<typeof createStudioTopObjectGroupFromLegacyObject>
      | null = null;

    if (object.kind === "profileBlock") {
      converted = createStudioProfileBlockGroupFromLegacyObject(object);
    } else if (
      object.presetId === "weeklyMemo" &&
      (object.kind === "text" || object.kind === "flexibleText")
    ) {
      converted = createStudioStructuredTextGroupFromLegacyObject(
        object,
        "weeklyMemo",
      );
    } else if (
      object.presetId === "artistProfileText" &&
      (object.kind === "text" || object.kind === "flexibleText")
    ) {
      converted = createStudioStructuredTextGroupFromLegacyObject(
        object,
        "artistProfileText",
      );
    } else if (
      object.presetId === "weeklyMemo" &&
      object.kind === "group" &&
      !object.variantSet
    ) {
      converted = createStudioStructuredTextVariantGroupFromFlatGroup(
        object,
        objects,
        "weeklyMemo",
      );
    } else if (
      object.presetId === "artistProfileText" &&
      object.kind === "group" &&
      !object.variantSet
    ) {
      converted = createStudioStructuredTextVariantGroupFromFlatGroup(
        object,
        objects,
        "artistProfileText",
      );
    } else if (
      object.presetId === "topObject" &&
      object.kind === "topObject"
    ) {
      converted = createStudioTopObjectGroupFromLegacyObject(object);
    }

    if (!converted) return;
    const { group, children } = converted;
    objects[objectId] = group;
    children.forEach((child) => {
      objects[child.id] = child;
    });
  });

  if (!objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID]) {
    objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID] =
      createStudioTimetableDayCardsObject();
  }

  const rootObjectIds =
    composition?.rootObjectIds && composition.rootObjectIds.length > 0
      ? [...composition.rootObjectIds]
      : [STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID];

  if (!rootObjectIds.includes(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID)) {
    rootObjectIds.unshift(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);
  }

  return {
    rootObjectIds: rootObjectIds.filter(
      (objectId, index, currentObjectIds) =>
        Boolean(objects[objectId]) &&
        !objects[objectId].parentId &&
        currentObjectIds.indexOf(objectId) === index,
    ),
    objects,
  };
};

export const getStudioTimetableComposition = (
  timetable?: StudioTimetableDomain,
): StudioTimetableComposition =>
  normalizeStudioTimetableComposition(timetable?.composition);

export const ensureStudioTimetableComposition = (
  timetable: StudioTimetableDomain,
): StudioTimetableComposition => {
  if (!timetable.composition) {
    timetable.composition = {
      rootObjectIds: [],
      objects: {},
    };
  }

  timetable.composition = normalizeStudioTimetableComposition(
    timetable.composition,
  );

  return timetable.composition;
};

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
        borderRadius: 56,
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
  const width = isWeeklyMemo
    ? STUDIO_WEEKLY_MEMO_WIDTH
    : STUDIO_ARTIST_WIDTH;
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
      "on",
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
    kind: isWeeklyMemo ? "flexibleText" : "text",
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

export const createStudioTopObjectPresetObjects = (
  composition: StudioTimetableComposition,
  options: {
    assetId?: StudioTimetableCompositionObject["backgroundAssetId"];
    variantInputId?: StudioInputId;
  } = {},
) => {
  const { objectId, suffix } = getUniqueTimetableObjectId(
    Object.keys(composition.objects),
    "top-object",
  );
  const label = suffix === 1 ? "Top Object" : `Top Object ${suffix}`;
  const width = 420;
  const height = 420;
  const { onGroupId, offGroupId } = getStudioVariantStateGroupIds(objectId);
  const onImageIds = getStudioTopObjectImageIds(onGroupId);
  const offImageIds = getStudioTopObjectImageIds(offGroupId);
  const commonChildStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width,
    height,
    rotateDeg: 0,
    opacity: 1,
    borderRadius: 0,
    overflow: "visible",
  };
  const group: StudioTimetableCompositionObject = {
    id: objectId,
    kind: "group",
    label,
    presetId: "topObject",
    parentId: null,
    childIds: [onGroupId, offGroupId],
    variantSet: createStudioTimetableOnOffVariantSet(
      onGroupId,
      offGroupId,
      "on",
      options.variantInputId,
    ),
    style: {
      position: "absolute",
      left: 3060,
      top: 260,
      width,
      height,
      rotateDeg: 0,
      opacity: 1,
      overflow: "visible",
    },
    meta: {
      exception: createStudioTopObjectExceptionMeta(
        options.assetId,
        "contain",
      ),
    },
  };
  const onGroup = createStudioVariantStateGroup(
    onGroupId,
    "Top Object On",
    objectId,
    [onImageIds.imageId],
    width,
    height,
  );
  const offGroup = createStudioVariantStateGroup(
    offGroupId,
    "Top Object Off",
    objectId,
    [offImageIds.imageId],
    width,
    height,
    true,
  );
  const image: StudioTimetableCompositionObject = {
    id: onImageIds.imageId,
    kind: "image",
    label: "top_object",
    presetId: "topObject",
    parentId: onGroupId,
    layoutMode: "fillParent",
    style: commonChildStyle,
    assetSlots: options.assetId
      ? {
          asset: {
            assetId: options.assetId,
            fit: "contain",
          },
        }
      : undefined,
  };
  const offImage: StudioTimetableCompositionObject = {
    ...cloneStudioTimetableCompositionObject(image),
    id: offImageIds.imageId,
    label: "top_object_off",
    parentId: offGroupId,
  };

  return { group, children: [onGroup, image, offGroup, offImage] };
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

export const createStudioTimetablePresetObject = (
  presetId: StudioTimetableObjectPresetId,
  composition: StudioTimetableComposition,
  options: {
    inputId?: StudioInputId;
    assetId?: StudioTimetableCompositionObject["backgroundAssetId"];
  } = {},
): StudioTimetableCompositionObject => {
  if (presetId === "dayCards") return createStudioTimetableDayCardsObject();

  const baseId =
    presetId === "board"
      ? "board"
      : presetId === "weekDates"
        ? "week-dates"
        : presetId === "weeklyMemo"
          ? "weekly-memo"
          : presetId === "profileBlock"
            ? "profile-block"
            : presetId === "artistProfileText"
              ? "artist-profile-text"
              : "top-object";
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

  if (presetId === "profileBlock") {
    return {
      id: objectId,
      kind: "profileBlock",
      label,
      presetId,
      style: {
        position: "absolute",
        left: 360,
        top: 470,
        width: 420,
        height: 420,
        borderRadius: 56,
        backgroundColor: "#dbeafe",
        opacity: 1,
        overflow: "hidden",
      },
      assetSlots: options.assetId
        ? {
            profileImage: {
              assetId: options.assetId,
              fit: "cover",
            },
          }
        : undefined,
      meta: {
        exception: createStudioProfileBlockExceptionMeta(
          options.assetId,
          "cover",
          true,
          undefined,
          "contain",
          56,
          "rounded",
        ),
      },
    };
  }

  if (presetId === "artistProfileText") {
    return {
      id: objectId,
      kind: "text",
      label,
      presetId,
      style: {
        position: "absolute",
        left: 840,
        top: 470,
        width: 1200,
        height: 180,
        color: "#172033",
        display: "flex",
        alignItems: "center",
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1.12,
        assetMode: "visible",
        assetPosition: "left",
        assetSize: 160,
        assetGap: 32,
        opacity: 1,
      },
      binding: options.inputId
        ? {
            kind: "inputText",
            inputId: options.inputId,
          }
        : {
            kind: "staticText",
            value: "Artist profile",
          },
      meta: {
        exception: createStudioArtistProfileTextExceptionMeta(options.inputId),
      },
    };
  }

  if (presetId === "topObject") {
    return {
      id: objectId,
      kind: "topObject",
      label,
      presetId,
      style: {
        position: "absolute",
        left: 3060,
        top: 260,
        width: 420,
        height: 420,
        borderRadius: 0,
        opacity: 1,
        overflow: "visible",
      },
      assetSlots: options.assetId
        ? {
            asset: {
              assetId: options.assetId,
              fit: "contain",
            },
          }
        : undefined,
      meta: {
        exception: createStudioTopObjectExceptionMeta(
          options.assetId,
          "contain",
        ),
      },
    };
  }

  return {
    id: objectId,
    kind: "text",
    label,
    presetId,
    style: {
      position: "absolute",
      left: 360,
      top: 1770,
      width: 1500,
      height: 110,
      color: "#475569",
      display: "flex",
      alignItems: "center",
      fontSize: 48,
      fontWeight: 700,
      opacity: 1,
    },
    binding: options.inputId
      ? {
          kind: "inputText",
          inputId: options.inputId,
        }
      : {
          kind: "staticText",
          value: "Weekly memo",
        },
    meta: {
      exception: createStudioWeeklyMemoExceptionMeta(options.inputId),
    },
  };
};

export const bindStudioWeeklyMemoObjectToInput = (
  object: StudioTimetableCompositionObject,
  inputId: StudioInputId,
) => {
  object.binding = {
    kind: "inputText",
    inputId,
  };
  if (object.structuredRole === "text") return;
  object.meta = {
    ...object.meta,
    exception: createStudioWeeklyMemoExceptionMeta(
      inputId,
      object.backgroundAssetId,
      object.backgroundFit,
      !object.hidden,
    ),
  };
};

export const bindStudioArtistProfileTextObjectToInput = (
  object: StudioTimetableCompositionObject,
  inputId: StudioInputId,
) => {
  object.binding = {
    kind: "inputText",
    inputId,
  };
  if (object.structuredRole === "text") return;
  object.meta = {
    ...object.meta,
    exception: createStudioArtistProfileTextExceptionMeta(
      inputId,
      !object.hidden,
      object.assetSlots?.asset,
    ),
  };
};

const getNumericStyleValue = (
  object: StudioTimetableCompositionObject,
  key: string,
  fallback: number,
) => {
  const value = object.style[key];
  return typeof value === "number" ? value : fallback;
};

export const getStudioTimetableCompositionObjectGeometry = (
  object: StudioTimetableCompositionObject,
) => ({
  left: getNumericStyleValue(object, "left", 0),
  top: getNumericStyleValue(object, "top", 0),
  width: getNumericStyleValue(object, "width", 0),
  height: getNumericStyleValue(object, "height", 0),
});
