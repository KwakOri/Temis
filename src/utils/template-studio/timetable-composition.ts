import {
  StudioInputId,
  StudioTimetableAssetSlot,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDomain,
  StudioTimetableObjectPresetId,
} from "@/types/template-studio";
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
  singleton: true,
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

export const createStudioTimetableDayCardsObject =
  (): StudioTimetableCompositionObject => ({
    id: STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
    kind: "generatedDayCards",
    label: "Day Card Containers",
    presetId: "dayCards",
    style: {},
    meta: {
      exception: createStudioTimetableDayCardsExceptionMeta(),
    },
  });

const inferStudioTimetableObjectPresetId = (
  object: StudioTimetableCompositionObject,
): StudioTimetableObjectPresetId | null => {
  if (object.presetId) return object.presetId;
  if (object.id === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) return "dayCards";
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
    return {
      ...object,
      presetId,
      binding: {
        kind: "builtinField",
        fieldId: "week.date_range",
      },
      meta: {
        ...object.meta,
        exception:
          object.meta?.exception ?? createStudioWeekDatesExceptionMeta(),
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

export const getStudioTimetableComposition = (
  timetable?: StudioTimetableDomain,
): StudioTimetableComposition => {
  const objects = Object.fromEntries(
    Object.entries(timetable?.composition?.objects ?? {}).map(
      ([objectId, object]) => [
        objectId,
        normalizeStudioTimetableCompositionObject(object),
      ],
    ),
  );

  if (!objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID]) {
    objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID] =
      createStudioTimetableDayCardsObject();
  }

  const rootObjectIds =
    timetable?.composition?.rootObjectIds &&
    timetable.composition.rootObjectIds.length > 0
      ? [...timetable.composition.rootObjectIds]
      : [STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID];

  if (!rootObjectIds.includes(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID)) {
    rootObjectIds.unshift(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);
  }

  return {
    rootObjectIds: rootObjectIds.filter(
      (objectId, index, currentObjectIds) =>
        Boolean(objects[objectId]) &&
        currentObjectIds.indexOf(objectId) === index,
    ),
    objects,
  };
};

export const ensureStudioTimetableComposition = (
  timetable: StudioTimetableDomain,
): StudioTimetableComposition => {
  if (!timetable.composition) {
    timetable.composition = {
      rootObjectIds: [],
      objects: {},
    };
  }

  if (!timetable.composition.objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID]) {
    timetable.composition.objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID] =
      createStudioTimetableDayCardsObject();
  }

  Object.entries(timetable.composition.objects).forEach(
    ([objectId, object]) => {
      timetable.composition!.objects[objectId] =
        normalizeStudioTimetableCompositionObject(object);
    },
  );

  if (
    !timetable.composition.rootObjectIds.includes(
      STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
    )
  ) {
    timetable.composition.rootObjectIds.unshift(
      STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
    );
  }

  timetable.composition.rootObjectIds =
    timetable.composition.rootObjectIds.filter(
      (objectId, index, objectIds) =>
        Boolean(timetable.composition?.objects[objectId]) &&
        objectIds.indexOf(objectId) === index,
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

export const getStudioTimetablePresetLabel = (
  presetId: StudioTimetableObjectPresetId,
) => {
  if (presetId === "weekDates") return "Week Dates";
  if (presetId === "weeklyMemo") return "Weekly Memo";
  if (presetId === "profileBlock") return "Profile Block";
  if (presetId === "artistProfileText") return "Artist / Profile Text";
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
    presetId === "weekDates"
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
