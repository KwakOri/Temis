import type {
  StudioTimetableDayCardsGridPreset,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
} from "@/types/template-studio";

/** The layout mode determines whether stored X/Y are canvas positions or grid offsets. */
export const getStudioTimetablePlacementMode = (
  layout: StudioTimetableDayCardsLayout,
) => (layout.gridPreset === "custom" ? "absolute" : "gridOffset");

export type StudioTimetablePlacementResolver = (
  layout: StudioTimetableDayCardsLayout,
) => Record<StudioTimetableDayId, { left: number; top: number }>;

/** Convert coordinates only when crossing placement modes; grid changes still reflow. */
export const applyStudioTimetableGridPreset = (
  layout: StudioTimetableDayCardsLayout,
  preset: {
    id: StudioTimetableDayCardsGridPreset;
    columns: number;
    rows: number;
  },
  dayIds: StudioTimetableDayId[],
  resolvePositions: StudioTimetablePlacementResolver,
  resolveEmptySlots: (layout: StudioTimetableDayCardsLayout) => number[],
) => {
  const previousMode = getStudioTimetablePlacementMode(layout);
  const nextMode = preset.id === "custom" ? "absolute" : "gridOffset";
  const positions = previousMode !== nextMode ? resolvePositions(layout) : null;
  const previousOffsets = layout.dayOffsets;
  layout.gridPreset = preset.id;
  layout.columns = preset.columns;
  layout.rows = Math.max(
    preset.rows,
    Math.ceil(dayIds.length / preset.columns),
  );
  layout.slots = undefined;
  layout.emptySlotIndexes =
    preset.id === "3x3" ? resolveEmptySlots(layout) : undefined;
  if (nextMode === "absolute") {
    layout.left = 0;
    layout.top = 0;
  }
  if (!positions) return;
  layout.dayOffsets = {};
  const gridPositions =
    nextMode === "gridOffset" ? resolvePositions(layout) : null;
  layout.dayOffsets = Object.fromEntries(
    dayIds.map((dayId) => {
      const current = positions[dayId] ?? { left: 0, top: 0 };
      const origin = gridPositions?.[dayId] ?? { left: 0, top: 0 };
      return [
        dayId,
        {
          left: current.left - origin.left,
          top: current.top - origin.top,
          ...(previousOffsets?.[dayId]?.rotateDeg !== undefined
            ? { rotateDeg: previousOffsets[dayId].rotateDeg }
            : {}),
        },
      ];
    }),
  );
};
