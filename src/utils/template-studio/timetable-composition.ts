import {
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDomain,
  StudioTimetableObjectPresetId,
} from "@/types/template-studio";

export const STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID = "day-cards";

export const createStudioTimetableDayCardsObject =
  (): StudioTimetableCompositionObject => ({
    id: STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
    kind: "generatedDayCards",
    label: "Day Card Containers",
    presetId: "dayCards",
    style: {},
  });

export const getStudioTimetableComposition = (
  timetable?: StudioTimetableDomain,
): StudioTimetableComposition => {
  const objects = {
    ...(timetable?.composition?.objects ?? {}),
  };

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
  return "Day Card Containers";
};

export const createStudioTimetablePresetObject = (
  presetId: StudioTimetableObjectPresetId,
  composition: StudioTimetableComposition,
): StudioTimetableCompositionObject => {
  if (presetId === "dayCards") return createStudioTimetableDayCardsObject();

  const baseId = presetId === "weekDates" ? "week-dates" : "weekly-memo";
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
        kind: "staticText",
        value: "2026.07.01 - 07.07",
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
    binding: {
      kind: "staticText",
      value: "Weekly memo",
    },
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
