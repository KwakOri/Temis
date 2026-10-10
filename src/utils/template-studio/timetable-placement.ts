import type {
  StudioTimetableDayCardsGridPreset,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
} from "@/types/template-studio";

/** Custom uses stored canvas positions; all other presets use the shared grid. */
export const getStudioTimetablePlacementMode = (
  layout: StudioTimetableDayCardsLayout,
) => (layout.gridPreset === "custom" ? "absolute" : "gridOffset");

export type StudioTimetablePlacementResolver = (
  layout: StudioTimetableDayCardsLayout,
) => Record<StudioTimetableDayId, { left: number; top: number }>;

/** Custom preserves visible positions; grid presets always reflow without per-card offsets. */
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
  if (nextMode === "gridOffset") {
    layout.dayOffsets = Object.fromEntries(
      dayIds.map((dayId) => [
        dayId,
        {
          left: 0,
          top: 0,
          ...(previousOffsets?.[dayId]?.rotateDeg !== undefined
            ? { rotateDeg: previousOffsets[dayId].rotateDeg }
            : {}),
        },
      ]),
    );
    if (positions && dayIds.length) {
      // Anchor the first card while the remaining cards reflow into the grid.
      const anchorId = dayIds.find((id) => positions[id]);
      if (anchorId) {
        layout.left = 0;
        layout.top = 0;
        const gridAnchor = resolvePositions(layout)[anchorId];
        if (gridAnchor) {
          layout.left = positions[anchorId].left - gridAnchor.left;
          layout.top = positions[anchorId].top - gridAnchor.top;
        }
      }
    }
    return;
  }
  if (!positions) return;
  layout.dayOffsets = Object.fromEntries(
    dayIds.map((dayId) => [
      dayId,
      {
        ...(positions[dayId] ?? { left: 0, top: 0 }),
        ...(previousOffsets?.[dayId]?.rotateDeg !== undefined
          ? { rotateDeg: previousOffsets[dayId].rotateDeg }
          : {}),
      },
    ]),
  );
};
