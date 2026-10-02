import type {
  StudioAsset,
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
  StudioTimetableDayCardsLayout,
} from "@/types/template-studio";
import type {
  StudioFigmaFrameImportPayload,
  StudioFigmaFrameImportLayer,
  StudioFigmaGridOriginCandidate,
} from "@/types/template-studio-figma";
import { applyStudioTimetableComponentFrames } from "@/utils/template-studio/entry-groups";
import { createStudioId } from "@/utils/template-studio/id";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import { applyStudioFigmaGridCandidate } from "./figma-component-import";
import {
  createStudioTimetableDayCardsObject,
  ensureStudioTimetableComposition,
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
} from "../timetable-composition";

export type StudioFigmaFrameImportResult =
  | { ok: true; componentIds: string[]; warnings: string[] }
  | { ok: false; reason: string };

const cloneData = <T>(value: T): T => structuredClone(value);

const clusterCoordinates = (values: number[], tolerance = 2): number[] => {
  const sorted = [...values].sort((left, right) => left - right);
  const clusters: number[][] = [];
  for (const value of sorted) {
    const current = clusters.at(-1);
    if (!current || Math.abs(value - current[current.length - 1]!) > tolerance) {
      clusters.push([value]);
    } else {
      current.push(value);
    }
  }
  return clusters.map(
    (cluster) => cluster.reduce((sum, value) => sum + value, 0) / cluster.length,
  );
};

const getNearestClusterIndex = (value: number, clusters: number[]): number => {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  clusters.forEach((cluster, index) => {
    const distance = Math.abs(value - cluster);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });
  return nearestIndex;
};

const mean = (values: number[], fallback: number): number =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback;

const setImportedGridLayout = (
  document: StudioTemplateDocument,
  payload: StudioFigmaFrameImportPayload,
  componentIdByPlacementId: Map<string, string>,
  warnings: string[],
) => {
  const timetable = document.domains?.timetable;
  const grid = payload.grid;
  if (!timetable || !grid || grid.placements.length === 0) return;

  const days = timetable.dayIds
    .map((dayId) => timetable.days[dayId])
    .filter(Boolean)
    .sort((left, right) => left.order - right.order);
  const placementHeight = mean(
    grid.placements.map((placement) => placement.bounds.height),
    timetable.dayCardsLayout?.entryPreviewHeight ?? 1,
  );
  const rowTolerance = Math.max(2, Math.min(placementHeight * 0.1, 96));
  const yCoordinates = clusterCoordinates(
    grid.placements.map((item) => item.bounds.top),
    rowTolerance,
  );
  const placementsByRow = new Map<number, typeof grid.placements>();
  grid.placements.forEach((placement) => {
    const row = getNearestClusterIndex(placement.bounds.top, yCoordinates);
    const rowPlacements = placementsByRow.get(row) ?? [];
    rowPlacements.push(placement);
    placementsByRow.set(row, rowPlacements);
  });
  const placements = [...placementsByRow.entries()]
    .flatMap(([row, rowPlacements]) =>
      [...rowPlacements]
        .sort((left, right) => left.bounds.left - right.bounds.left)
        .map((placement, column) => ({ ...placement, row, column })),
    )
    .sort((left, right) => left.row - right.row || left.column - right.column);
  const columns = Math.max(
    1,
    ...[...placementsByRow.values()].map((rowPlacements) => rowPlacements.length),
  );
  const rows = Math.max(1, yCoordinates.length, Math.ceil(days.length / columns));

  if (placements.length !== days.length) {
    warnings.push(
      `GRID has ${placements.length} visible placements for ${days.length} timetable days; unmatched days use the existing card assignment.`,
    );
  }

  const previousLayout = timetable.dayCardsLayout;
  const dayWidth = mean(
    placements.map((placement) => placement.bounds.width),
    previousLayout?.dayWidth ?? 1,
  );
  const columnDistances = placements.flatMap((placement) => {
    const next = placements.find(
      (candidate) => candidate.row === placement.row && candidate.column === placement.column + 1,
    );
    return next ? [next.bounds.left - placement.bounds.left - placement.bounds.width] : [];
  });
  const rowDistances = placements.flatMap((placement) => {
    const next = placements.find(
      (candidate) => candidate.column === placement.column && candidate.row === placement.row + 1,
    );
    return next ? [next.bounds.top - placement.bounds.top - placement.bounds.height] : [];
  });
  const columnGap = mean(columnDistances, previousLayout?.columnGap ?? previousLayout?.dayGap ?? 0);
  const rowGap = mean(rowDistances, previousLayout?.rowGap ?? previousLayout?.dayGap ?? 0);
  const slots: Array<string | null> = Array(columns * rows).fill(null);
  const dayOffsets: NonNullable<StudioTimetableDayCardsLayout["dayOffsets"]> = {};
  const assignedDays = new Set<string>();

  placements.forEach((placement, index) => {
    const day = days[index];
    if (!day) return;
    const slotIndex = placement.row * columns + placement.column;
    if (slots[slotIndex] !== null) {
      warnings.push("Overlapping GRID placements share a cell; the first placement determines its day order.");
      return;
    }
    slots[slotIndex] = day.id;
    assignedDays.add(day.id);
    const componentId = componentIdByPlacementId.get(placement.sourceNodeId);
    if (componentId) day.componentId = componentId;
    const baselineLeft = grid.bounds.left + placement.column * (dayWidth + columnGap);
    const baselineTop = grid.bounds.top + placement.row * (placementHeight + rowGap);
    dayOffsets[day.id] = {
      left: placement.bounds.left - baselineLeft,
      top: placement.bounds.top - baselineTop,
      ...(placement.rotateDeg !== undefined ? { rotateDeg: placement.rotateDeg } : {}),
    };
  });

  // The layout resolver fills null slots with remaining timetable days. Record
  // those IDs explicitly so Figma's holes and row/column order stay stable.
  let nextUnassignedDay = 0;
  slots.forEach((slot, index) => {
    if (slot !== null) return;
    while (days[nextUnassignedDay] && assignedDays.has(days[nextUnassignedDay]!.id)) {
      nextUnassignedDay += 1;
    }
    const day = days[nextUnassignedDay];
    if (!day) return;
    slots[index] = day.id;
    assignedDays.add(day.id);
    nextUnassignedDay += 1;
  });

  const padding = previousLayout?.padding ?? 0;
  const headerHeight = previousLayout?.headerHeight ?? 0;
  timetable.dayCardsLayout = {
    ...(previousLayout ?? {
      left: grid.bounds.left,
      top: grid.bounds.top,
      dayWidth,
      dayGap: columnGap,
      padding,
      headerHeight,
      entryPreviewWidth: dayWidth,
      entryPreviewHeight: placementHeight,
      entryGap: 0,
    }),
    left: grid.bounds.left,
    top: grid.bounds.top,
    dayWidth,
    gridPreset: "custom",
    columns,
    rows,
    dayGap: columnGap,
    columnGap,
    rowGap,
    fillOrder: "row",
    alignLastRow: "start",
    slots,
    padding,
    headerHeight,
    entryPreviewWidth: Math.max(1, dayWidth - padding * 2),
    entryPreviewHeight: Math.max(1, placementHeight - headerHeight - padding * 2),
    dayOffsets,
  };
};

const makeImageObject = (
  layer: StudioFigmaFrameImportLayer,
): StudioTimetableCompositionObject => ({
  id: createStudioId("figma_layer"),
  kind: "image",
  label: layer.label.slice(0, 160) || "Figma layer",
  parentId: null,
  style: {
    position: "absolute",
    left: layer.bounds.left,
    top: layer.bounds.top,
    width: layer.bounds.width,
    height: layer.bounds.height,
    opacity: 1,
    rotateDeg: 0,
  },
  assetSlots: {
    asset: { assetId: layer.asset.id, fit: "cover" },
  },
});

const getImportedComponentIds = (
  document: StudioTemplateDocument,
  candidates: StudioFigmaGridOriginCandidate[],
  componentIdByPlacementId: Map<string, string>,
  warnings: string[],
): string[] => {
  const componentIds: string[] = [];
  for (const candidate of candidates) {
    const result = applyStudioFigmaGridCandidate(document, candidate);
    if (!result.ok) throw new Error(result.reason);
    componentIds.push(result.componentId);
    for (const placementId of candidate.placementInstanceIds) {
      componentIdByPlacementId.set(placementId, result.componentId);
    }
    warnings.push(...result.warnings);
  }
  return componentIds;
};

export const applyStudioFigmaFrameImport = (
  document: StudioTemplateDocument,
  payload: StudioFigmaFrameImportPayload,
): StudioFigmaFrameImportResult => {
  const draft = cloneData(document);
  const timetable = draft.domains?.timetable;
  if (!timetable) return { ok: false, reason: "Document timetable domain is missing" };
  if (
    !Number.isFinite(payload.frame.width) ||
    !Number.isFinite(payload.frame.height) ||
    payload.frame.width <= 0 ||
    payload.frame.height <= 0
  ) {
    return { ok: false, reason: "Figma frame dimensions are invalid" };
  }

  const warnings = [...payload.warnings];
  const componentIdByPlacementId = new Map<string, string>();
  let componentIds: string[];
  try {
    componentIds = getImportedComponentIds(
      draft,
      payload.gridCandidates,
      componentIdByPlacementId,
      warnings,
    );
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Figma GRID could not be imported",
    };
  }

  const composition = ensureStudioTimetableComposition(timetable);
  const dayCards =
    composition.objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID] ??
    createStudioTimetableDayCardsObject();
  const importedObjects: Record<string, StudioTimetableCompositionObject> = {
    [dayCards.id]: dayCards,
  };
  const orderedRootLayers: Array<{ zIndex: number; objectId: string }> = [];
  const occupiedObjectIds = new Set<string>(Object.keys(composition.objects));

  for (const layer of payload.layers) {
    const existingAsset = draft.assets[layer.asset.id];
    if (
      existingAsset &&
      (existingAsset.contentHash !== layer.asset.contentHash ||
        existingAsset.storagePath !== layer.asset.storagePath)
    ) {
      return { ok: false, reason: "Imported Figma asset ID conflicts with the document" };
    }
    draft.assets[layer.asset.id] = cloneData(layer.asset) as StudioAsset;
    let object = makeImageObject(layer);
    while (occupiedObjectIds.has(object.id)) object = makeImageObject(layer);
    occupiedObjectIds.add(object.id);
    importedObjects[object.id] = object;
    orderedRootLayers.push({ zIndex: layer.zIndex, objectId: object.id });
  }

  if (payload.grid) {
    orderedRootLayers.push({
      zIndex: payload.grid.zIndex,
      objectId: STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
    });
    setImportedGridLayout(draft, payload, componentIdByPlacementId, warnings);
  }

  timetable.canvas = {
    ...(timetable.canvas ?? {}),
    width: payload.frame.width,
    height: payload.frame.height,
  };
  timetable.composition = {
    objects: importedObjects,
    rootObjectIds: payload.grid
      ? orderedRootLayers
          .sort((left, right) => left.zIndex - right.zIndex)
          .map((layer) => layer.objectId)
      : orderedRootLayers.map((layer) => layer.objectId),
  };
  if (!payload.grid) timetable.composition.rootObjectIds.push(dayCards.id);

  applyStudioTimetableComponentFrames(draft);
  if (validateStudioDocument(draft).some((diagnostic) => diagnostic.severity === "error")) {
    return { ok: false, reason: "Imported frame would violate document validation" };
  }

  document.graph = draft.graph;
  document.styles = draft.styles;
  document.assets = draft.assets;
  document.domains = draft.domains;
  return { ok: true, componentIds, warnings: [...new Set(warnings)] };
};
