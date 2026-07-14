"use client";

import React, { useMemo } from "react";

import {
  StudioAsset,
  StudioTimetableDayDefinition,
  StudioTimetableDayId,
  StudioGraphNode,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayCardsAlignLastRow,
  StudioTimetableDayCardsFillOrder,
  StudioTimetableDayCardsGridPreset,
  StudioTimetableDomain,
  StudioTimetableAssetSlot,
  StudioTimetableComponentDefinition,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import { resolveStudioTextBinding } from "@/utils/template-studio/binding-resolver";
import { getStudioTimetableDayComponent } from "@/utils/template-studio/component-sets";
import { resolveStudioWeekDateText } from "@/utils/template-studio/date-template";
import { getStudioRuntimeInputValue } from "@/utils/template-studio/input-values";
import { getStudioPaintOrder } from "@/utils/template-studio/layer-order";
import {
  getStudioObjectRenderStyle,
  resolveStudioTimetableObjectGeometry,
} from "@/utils/template-studio/object-layout";
import {
  getStudioTimetableObjectRenderableChildIds,
  getStudioTimetableObjectRuntimeVariantValue,
  getStudioTimetableComposition,
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
} from "@/utils/template-studio/timetable-composition";
import {
  getStudioTimetableEntriesForDay,
  resolveStudioTimetableComponentVariant,
} from "@/utils/template-studio/timetable-runtime";
import {
  getStudioTimetableComponentFrame,
  resolveStudioTimetableDayVariantStatus,
} from "@/utils/template-studio/entry-groups";
import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";

import { StudioWebFontLoader } from "./studio-web-font-loader";

import { StudioRenderer } from "./studio-renderer";

export const STUDIO_TIMETABLE_DEFAULT_CANVAS_SIZE = {
  width: 4000,
  height: 2250,
};

export const STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT = {
  left: 434,
  top: 760,
  dayWidth: 420,
  gridPreset: "1x7",
  columns: 7,
  rows: 1,
  dayGap: 32,
  columnGap: 32,
  rowGap: 32,
  fillOrder: "row",
  alignLastRow: "start",
  padding: 28,
  headerHeight: 76,
  entryPreviewWidth: 360,
  entryPreviewHeight: 212,
  entryGap: 24,
} satisfies StudioTimetableDayCardsLayout;

export const STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS = [
  { id: "1x7", label: "7 columns", columns: 7, rows: 1 },
  { id: "7x1", label: "1 column", columns: 1, rows: 7 },
  { id: "4x2", label: "4 x 2", columns: 4, rows: 2 },
  { id: "3x3", label: "3 x 3", columns: 3, rows: 3 },
  { id: "custom", label: "Custom", columns: 7, rows: 1 },
] as const;

type StudioTimetableDayCardGridPosition = {
  column: number;
  row: number;
};

export type StudioTimetableDayCardGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type StudioTimetableEntryCardSize = {
  width: number;
  height: number;
};

export type StudioTimetableEntryCardSizeResolver = (
  dayId: StudioTimetableDayId,
) => StudioTimetableEntryCardSize;

type StudioTimetableEntryRootGeometry = StudioTimetableEntryCardSize & {
  rootLeft: number;
  rootTop: number;
};

const clampGridSize = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(12, Math.max(1, Math.round(parsed)));
};

const getDayCardGridPreset = (preset: StudioTimetableDayCardsGridPreset) =>
  STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS.find(
    (candidate) => candidate.id === preset,
  ) ?? STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS[0];

const normalizeStudioGridEmptySlotIndexes = (
  emptySlotIndexes: number[] | undefined,
  slotCount: number,
  itemCount: number,
) => {
  const emptySlotCount = Math.max(0, slotCount - itemCount);
  const normalized = (emptySlotIndexes ?? []).reduce<number[]>(
    (indexes, index) => {
      const normalizedIndex = Math.floor(index);
      if (
        !Number.isFinite(index) ||
        normalizedIndex < 0 ||
        normalizedIndex >= slotCount ||
        indexes.includes(normalizedIndex) ||
        indexes.length >= emptySlotCount
      ) {
        return indexes;
      }
      return [...indexes, normalizedIndex];
    },
    [],
  );

  for (
    let index = slotCount - 1;
    index >= 0 && normalized.length < emptySlotCount;
    index -= 1
  ) {
    if (!normalized.includes(index)) normalized.unshift(index);
  }

  return normalized;
};

export const getStudioTimetableThreeByThreeEmptySlotIndexes = (
  layout: StudioTimetableDayCardsLayout,
  dayCount: number,
) =>
  normalizeStudioGridEmptySlotIndexes(
    layout.emptySlotIndexes,
    9,
    Math.min(9, Math.max(0, dayCount)),
  );

const getStudioGridTraversalSlotIndexes = (
  columns: number,
  rows: number,
  fillOrder: StudioTimetableDayCardsFillOrder,
) => {
  const slotCount = columns * rows;
  if (fillOrder !== "column") {
    return Array.from({ length: slotCount }, (_, index) => index);
  }

  return Array.from({ length: slotCount }, (_, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    return row * columns + column;
  });
};

const getAlignedIncompleteTrackOffset = (
  trackCount: number,
  itemCount: number,
  align: StudioTimetableDayCardsAlignLastRow,
) => {
  const remainingTracks = Math.max(0, trackCount - itemCount);
  if (align === "center") return remainingTracks / 2;
  if (align === "end") return remainingTracks;
  return 0;
};

const getGeneratedDayCardGridPosition = ({
  dayIndex,
  dayCount,
  columns,
  rows,
  fillOrder,
  alignLastRow,
}: {
  dayIndex: number;
  dayCount: number;
  columns: number;
  rows: number;
  fillOrder: StudioTimetableDayCardsFillOrder;
  alignLastRow: StudioTimetableDayCardsAlignLastRow;
}): StudioTimetableDayCardGridPosition => {
  if (fillOrder === "column") {
    const column = Math.floor(dayIndex / rows);
    const indexInColumn = dayIndex % rows;
    const lastColumn = Math.floor((dayCount - 1) / rows);
    const lastColumnCount = ((dayCount - 1) % rows) + 1;
    const rowOffset =
      column === lastColumn && lastColumnCount < rows
        ? getAlignedIncompleteTrackOffset(rows, lastColumnCount, alignLastRow)
        : 0;

    return {
      column,
      row: indexInColumn + rowOffset,
    };
  }

  const row = Math.floor(dayIndex / columns);
  const indexInRow = dayIndex % columns;
  const lastRow = Math.floor((dayCount - 1) / columns);
  const lastRowCount = ((dayCount - 1) % columns) + 1;
  const columnOffset =
    row === lastRow && lastRowCount < columns
      ? getAlignedIncompleteTrackOffset(columns, lastRowCount, alignLastRow)
      : 0;

  return {
    column: indexInRow + columnOffset,
    row,
  };
};

const getDayCardGridPosition = (
  layout: StudioTimetableDayCardsLayout,
  dayId: StudioTimetableDayId,
  dayIndex: number,
  dayCount: number,
): StudioTimetableDayCardGridPosition => {
  const columns = layout.columns ?? 7;
  const rows = layout.rows ?? 1;
  const slots = layout.slots ?? [];
  const slotIndex = slots.findIndex((slotDayId) => slotDayId === dayId);

  if (slotIndex >= 0) {
    return {
      column: slotIndex % columns,
      row: Math.floor(slotIndex / columns),
    };
  }

  if (layout.gridPreset === "3x3") {
    const emptySlotIndexes = new Set(
      getStudioTimetableThreeByThreeEmptySlotIndexes(layout, dayCount),
    );
    const occupiedSlotIndexes = getStudioGridTraversalSlotIndexes(
      columns,
      rows,
      layout.fillOrder ?? "row",
    ).filter((index) => !emptySlotIndexes.has(index));
    const generatedSlotIndex = occupiedSlotIndexes[dayIndex];

    if (generatedSlotIndex !== undefined) {
      return {
        column: generatedSlotIndex % columns,
        row: Math.floor(generatedSlotIndex / columns),
      };
    }
  }

  return getGeneratedDayCardGridPosition({
    dayIndex,
    dayCount,
    columns,
    rows,
    fillOrder: layout.fillOrder ?? "row",
    alignLastRow: layout.alignLastRow ?? "start",
  });
};

export const getStudioTimetablePreviewSize = (
  timetable?: StudioTimetableDomain,
) => ({
  width: timetable?.canvas?.width ?? STUDIO_TIMETABLE_DEFAULT_CANVAS_SIZE.width,
  height:
    timetable?.canvas?.height ?? STUDIO_TIMETABLE_DEFAULT_CANVAS_SIZE.height,
});

export const getStudioTimetableDayCardsLayout = (
  timetable?: StudioTimetableDomain,
): StudioTimetableDayCardsLayout => {
  const rawLayout = {
    ...STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
    ...(timetable?.dayCardsLayout ?? {}),
  };
  const dayCount = Math.max(1, timetable?.dayIds.length ?? 7);
  const rawPreset = rawLayout.gridPreset ?? "1x7";
  const gridPreset: StudioTimetableDayCardsGridPreset =
    rawPreset === "custom" ||
    rawPreset === "7x1" ||
    rawPreset === "4x2" ||
    rawPreset === "3x3"
      ? rawPreset
      : "1x7";
  const preset = getDayCardGridPreset(gridPreset);
  const columns =
    gridPreset === "custom"
      ? clampGridSize(rawLayout.columns, preset.columns)
      : preset.columns;
  const rows =
    gridPreset === "custom"
      ? Math.max(
          clampGridSize(rawLayout.rows, preset.rows),
          Math.ceil(dayCount / columns),
        )
      : Math.max(preset.rows, Math.ceil(dayCount / columns));
  const columnGap =
    typeof rawLayout.columnGap === "number"
      ? rawLayout.columnGap
      : rawLayout.dayGap;
  const rowGap =
    typeof rawLayout.rowGap === "number" ? rawLayout.rowGap : rawLayout.dayGap;
  const slotCount = columns * rows;

  return {
    ...rawLayout,
    gridPreset,
    columns,
    rows,
    dayGap: columnGap,
    columnGap,
    rowGap,
    fillOrder: rawLayout.fillOrder ?? "row",
    alignLastRow: rawLayout.alignLastRow ?? "start",
    slots: (rawLayout.slots ?? []).slice(0, slotCount),
    emptySlotIndexes:
      gridPreset === "3x3"
        ? normalizeStudioGridEmptySlotIndexes(
            rawLayout.emptySlotIndexes,
            slotCount,
            dayCount,
          )
        : undefined,
    dayOffsets: {
      ...(rawLayout.dayOffsets ?? {}),
    },
  };
};

const getFallbackEntryCardSize = (
  layout: StudioTimetableDayCardsLayout,
): StudioTimetableEntryCardSize => ({
  width: Math.max(1, layout.entryPreviewWidth || layout.dayWidth || 1),
  height: Math.max(1, layout.entryPreviewHeight || 1),
});

const getStudioTimetableEntryRootGeometry = (
  document: StudioTemplateDocument,
  rootNode: StudioGraphNode | undefined,
): StudioTimetableEntryRootGeometry => {
  const rootStyle = rootNode?.styleId
    ? document.styles[rootNode.styleId]
    : undefined;

  return {
    rootLeft: getNumericStyleValue(rootStyle, "left", 0),
    rootTop: getNumericStyleValue(rootStyle, "top", 0),
    width: Math.max(
      1,
      getNumericStyleValue(rootStyle, "width", document.canvas.width),
    ),
    height: Math.max(
      1,
      getNumericStyleValue(rootStyle, "height", document.canvas.height),
    ),
  };
};

export const getStudioTimetableEntryCardSize = (
  document: StudioTemplateDocument,
  component?: StudioTimetableComponentDefinition,
): StudioTimetableEntryCardSize => {
  if (component) {
    const frame = getStudioTimetableComponentFrame(document, component);
    return { width: frame.width, height: frame.height };
  }

  const rootNodes = document.graph.rootNodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean);

  if (rootNodes.length === 0) {
    return {
      width: Math.max(1, document.canvas.width),
      height: Math.max(1, document.canvas.height),
    };
  }

  const geometries = rootNodes.map((rootNode) =>
    getStudioTimetableEntryRootGeometry(document, rootNode),
  );

  return {
    width: Math.max(...geometries.map((geometry) => geometry.width)),
    height: Math.max(...geometries.map((geometry) => geometry.height)),
  };
};

export const getStudioTimetableDayCardHeight = (
  layout: StudioTimetableDayCardsLayout,
  _entryCount: number,
  entryCardSize: StudioTimetableEntryCardSize = getFallbackEntryCardSize(
    layout,
  ),
) => Math.max(1, entryCardSize.height);

export const getStudioTimetableDayCardGeometry = (
  layout: StudioTimetableDayCardsLayout,
  dayId: StudioTimetableDayId,
  dayIndex: number,
  entryCount: number,
  entryCardSize: StudioTimetableEntryCardSize = getFallbackEntryCardSize(
    layout,
  ),
) => {
  const offset = layout.dayOffsets?.[dayId] ?? { left: 0, top: 0 };
  const position = getDayCardGridPosition(
    layout,
    dayId,
    dayIndex,
    dayIndex + 1,
  );

  return {
    left:
      layout.left +
      position.column *
        (entryCardSize.width + (layout.columnGap ?? layout.dayGap)) +
      offset.left,
    top:
      layout.top +
      position.row *
        (getStudioTimetableDayCardHeight(layout, entryCount, entryCardSize) +
          (layout.rowGap ?? layout.dayGap)) +
      offset.top,
    width: entryCardSize.width,
    height: getStudioTimetableDayCardHeight(layout, entryCount, entryCardSize),
  };
};

const resolveEntryCardSize = (
  layout: StudioTimetableDayCardsLayout,
  dayId: StudioTimetableDayId,
  entryCardSizeOrResolver:
    | StudioTimetableEntryCardSize
    | StudioTimetableEntryCardSizeResolver,
) => {
  const size =
    typeof entryCardSizeOrResolver === "function"
      ? entryCardSizeOrResolver(dayId)
      : entryCardSizeOrResolver;
  const fallback = getFallbackEntryCardSize(layout);

  return {
    width: Math.max(1, Number.isFinite(size?.width) ? size.width : fallback.width),
    height: Math.max(
      1,
      Number.isFinite(size?.height) ? size.height : fallback.height,
    ),
  };
};

const getTrackOrigin = (
  start: number,
  trackSizes: number[],
  rawIndex: number,
  gap: number,
) => {
  const index = Math.max(0, Math.floor(rawIndex));
  const fraction = Math.max(0, rawIndex - index);
  const precedingSize = trackSizes
    .slice(0, index)
    .reduce((total, size) => total + size + gap, 0);
  const currentTrackSize = trackSizes[index] ?? 0;
  return start + precedingSize + fraction * (currentTrackSize + gap);
};

export const getStudioTimetableDayCardGeometries = (
  layout: StudioTimetableDayCardsLayout,
  days: StudioTimetableDayDefinition[],
  getEntryCount: (dayId: StudioTimetableDayId) => number,
  entryCardSizeOrResolver:
    | StudioTimetableEntryCardSize
    | StudioTimetableEntryCardSizeResolver = getFallbackEntryCardSize(layout),
): Record<StudioTimetableDayId, StudioTimetableDayCardGeometry> => {
  const columnWidths = Array.from({ length: layout.columns ?? 1 }, () => 0);
  const rowHeights = Array.from({ length: layout.rows ?? 1 }, () => 0);
  const explicitPositions = new Map<
    StudioTimetableDayId,
    StudioTimetableDayCardGridPosition
  >();
  const slots = layout.slots ?? [];

  if (slots.length > 0) {
    const emptySlotIndexes: number[] = [];
    const usedDayIds = new Set<StudioTimetableDayId>();

    slots.forEach((slotDayId, slotIndex) => {
      if (slotDayId && !usedDayIds.has(slotDayId)) {
        usedDayIds.add(slotDayId);
        explicitPositions.set(slotDayId, {
          column: slotIndex % (layout.columns ?? 1),
          row: Math.floor(slotIndex / (layout.columns ?? 1)),
        });
        return;
      }

      emptySlotIndexes.push(slotIndex);
    });

    let nextEmptySlotIndex = 0;
    days.forEach((day) => {
      if (explicitPositions.has(day.id)) return;

      const slotIndex = emptySlotIndexes[nextEmptySlotIndex];
      nextEmptySlotIndex += 1;
      if (slotIndex === undefined) return;

      explicitPositions.set(day.id, {
        column: slotIndex % (layout.columns ?? 1),
        row: Math.floor(slotIndex / (layout.columns ?? 1)),
      });
    });
  }

  const dayPositions = days.map((day, dayIndex) => {
    const entryCount = getEntryCount(day.id);
    const entryCardSize = resolveEntryCardSize(
      layout,
      day.id,
      entryCardSizeOrResolver,
    );
    const height = getStudioTimetableDayCardHeight(
      layout,
      entryCount,
      entryCardSize,
    );
    const position =
      explicitPositions.get(day.id) ??
      getDayCardGridPosition(layout, day.id, dayIndex, days.length);
    const rowIndex = Math.max(0, Math.floor(position.row));
    const columnIndex = Math.max(0, Math.floor(position.column));
    columnWidths[columnIndex] = Math.max(
      columnWidths[columnIndex] ?? 0,
      entryCardSize.width,
    );
    rowHeights[rowIndex] = Math.max(rowHeights[rowIndex] ?? 0, height);

    return {
      day,
      entryCardSize,
      height,
      position,
    };
  });
  const fallback = getFallbackEntryCardSize(layout);
  const maximumColumnWidth = Math.max(fallback.width, ...columnWidths);
  const maximumRowHeight = Math.max(fallback.height, ...rowHeights);
  columnWidths.forEach((width, index) => {
    if (width <= 0) columnWidths[index] = maximumColumnWidth;
  });
  rowHeights.forEach((height, index) => {
    if (height <= 0) rowHeights[index] = maximumRowHeight;
  });
  const columnGap = layout.columnGap ?? layout.dayGap;
  const rowGap = layout.rowGap ?? layout.dayGap;

  return Object.fromEntries(
    dayPositions.map(({ day, entryCardSize, height, position }) => {
      const offset = layout.dayOffsets?.[day.id] ?? { left: 0, top: 0 };
      return [
        day.id,
        {
          left: getTrackOrigin(
            layout.left,
            columnWidths,
            position.column,
            columnGap,
          ) + offset.left,
          top: getTrackOrigin(
            layout.top,
            rowHeights,
            position.row,
            rowGap,
          ) + offset.top,
          width: entryCardSize.width,
          height,
        },
      ];
    }),
  );
};

export const getStudioTimetableDayCardsBounds = (
  layout: StudioTimetableDayCardsLayout,
  days: StudioTimetableDayDefinition[],
  getEntryCount: (dayId: StudioTimetableDayId) => number,
  entryCardSizeOrResolver:
    | StudioTimetableEntryCardSize
    | StudioTimetableEntryCardSizeResolver = getFallbackEntryCardSize(layout),
) => {
  const geometries = Object.values(
    getStudioTimetableDayCardGeometries(
      layout,
      days,
      getEntryCount,
      entryCardSizeOrResolver,
    ),
  );
  if (geometries.length === 0) {
    const entryCardSize = resolveEntryCardSize(
      layout,
      "",
      entryCardSizeOrResolver,
    );
    return {
      left: layout.left,
      top: layout.top,
      width: entryCardSize.width,
      height: getStudioTimetableDayCardHeight(layout, 1, entryCardSize),
    };
  }

  const left = Math.min(...geometries.map((geometry) => geometry.left));
  const top = Math.min(...geometries.map((geometry) => geometry.top));
  const right = Math.max(
    ...geometries.map((geometry) => geometry.left + geometry.width),
  );
  const bottom = Math.max(
    ...geometries.map((geometry) => geometry.top + geometry.height),
  );

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
};

const getNumericStyleValue = (
  styleRecord: StudioStyleRecord | undefined,
  key: string,
  fallback: number,
) => {
  const value = styleRecord?.[key];
  return typeof value === "number" ? value : fallback;
};

const getStringStyleValue = (
  styleRecord: StudioStyleRecord | undefined,
  key: string,
  fallback: string,
) => {
  const value = styleRecord?.[key];
  return typeof value === "string" ? value : fallback;
};

const isWeekDatesObject = (object: StudioTimetableCompositionObject) =>
  object.presetId === "weekDates" ||
  object.meta?.exception?.semanticKey === "weekDates";

const resolveWeekDatesText = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableCompositionObject,
) => {
  const format = getStringStyleValue(object.style, "dateRangeFormat", "long");
  const template = getStringStyleValue(object.style, "dateRangeTemplate", "");
  const startDate = runtimeValues.timetable.weekStartDate;

  return resolveStudioWeekDateText(document, { format, template, startDate });
};

const resolveTimetableObjectText = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableCompositionObject,
) => {
  if (isWeekDatesObject(object)) {
    return resolveWeekDatesText(document, runtimeValues, object) || object.label;
  }

  const value = resolveStudioTextBinding(
    document,
    runtimeValues,
    object.binding,
  );
  return value || object.label;
};

const isArtistProfileTextObject = (object: StudioTimetableCompositionObject) =>
  object.presetId === "artistProfileText" ||
  object.meta?.exception?.semanticKey === "artistProfileText";

const resolveTimetableAssetSlot = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  slot?: StudioTimetableAssetSlot,
): StudioAsset | null => {
  if (!slot) return null;

  if (slot.inputId) {
    const input = document.inputs[slot.inputId];
    if (!input || input.type !== "image") return null;

    const value = getStudioRuntimeInputValue(input, runtimeValues);
    if (!value) return null;

    return {
      id: `runtime:${input.id}`,
      label: input.label,
      src: value,
    };
  }

  return slot.assetId ? (document.assets[slot.assetId] ?? null) : null;
};

const getTimetableCssOpacity = (value: unknown): number => {
  const parsedValue = Number(value ?? 1);
  if (!Number.isFinite(parsedValue)) return 1;
  const normalizedValue = parsedValue <= 1 ? parsedValue : parsedValue / 100;
  return Math.min(Math.max(normalizedValue, 0), 1);
};

const getTimetableObjectStyle = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableCompositionObject,
): React.CSSProperties => {
  const resolvedStyle = getStudioObjectRenderStyle(
    object.style,
    object.layoutMode,
  );
  const { opacity, rotateDeg, ...styleRecord } = resolvedStyle;
  delete styleRecord.dateRangeFormat;
  delete styleRecord.dateRangeTemplate;
  delete styleRecord.assetMode;
  delete styleRecord.assetPosition;
  delete styleRecord.assetGap;
  delete styleRecord.assetSize;
  const backgroundSlot = object.assetSlots?.background;
  const backgroundAsset =
    resolveTimetableAssetSlot(document, runtimeValues, backgroundSlot) ??
    (object.backgroundAssetId
      ? document.assets[object.backgroundAssetId]
      : null);
  const backgroundFit = backgroundSlot?.fit ?? object.backgroundFit;
  const backgroundSize =
    backgroundFit === "fill" ? "100% 100%" : (backgroundFit ?? "cover");

  return {
    ...styleRecord,
    position: "absolute",
    opacity: getTimetableCssOpacity(opacity),
    backgroundImage: backgroundAsset
      ? `url(${JSON.stringify(backgroundAsset.src)})`
      : undefined,
    backgroundPosition: backgroundAsset ? "center" : undefined,
    backgroundRepeat: backgroundAsset ? "no-repeat" : undefined,
    backgroundSize: backgroundAsset ? backgroundSize : undefined,
    transform:
      typeof rotateDeg === "number" ? `rotate(${rotateDeg}deg)` : undefined,
  } as React.CSSProperties;
};

interface StudioTimetablePreviewProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
  variantMode?: "authoring" | "runtime";
}

export function StudioTimetablePreview({
  document,
  runtimeValues,
  selectedLayerId = null,
  onSelectLayer,
  variantMode = "runtime",
}: StudioTimetablePreviewProps) {
  const timetable = document.domains?.timetable;
  const days = useMemo(() => {
    if (!timetable) return [];
    return timetable.dayIds
      .map((dayId) => timetable.days[dayId])
      .filter(Boolean);
  }, [timetable]);
  const componentByDayId = useMemo(
    () =>
      Object.fromEntries(
        days.map((day) => [
          day.id,
          getStudioTimetableDayComponent(document, day.id),
        ]),
      ),
    [days, document],
  );
  const entriesByDay = useMemo(
    () =>
      Object.fromEntries(
        days.map((day) => [
          day.id,
          getStudioTimetableEntriesForDay(document, runtimeValues, day.id),
        ]),
      ),
    [days, document, runtimeValues],
  );
  const previewSize = getStudioTimetablePreviewSize(timetable);
  const dayCardsLayout = getStudioTimetableDayCardsLayout(timetable);
  const composition = getStudioTimetableComposition(timetable);
  const getEntryCardSize = (dayId: StudioTimetableDayId) =>
    getStudioTimetableEntryCardSize(document, componentByDayId[dayId]);
  const getPreviewEntryCount = (dayId: StudioTimetableDayId) =>
    entriesByDay[dayId]?.length ?? 0;
  const dayCardGeometries = getStudioTimetableDayCardGeometries(
    dayCardsLayout,
    days,
    getPreviewEntryCount,
    getEntryCardSize,
  );
  const dayCardsBounds = getStudioTimetableDayCardsBounds(
    dayCardsLayout,
    days,
    getPreviewEntryCount,
    getEntryCardSize,
  );

  const renderDayCardsObject = () => (
    <div
      className="absolute overflow-visible"
      data-node-id={STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID}
      key={STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID}
      style={{
        left: dayCardsBounds.left,
        top: dayCardsBounds.top,
        width: dayCardsBounds.width,
        height: dayCardsBounds.height,
        opacity: getTimetableCssOpacity(
          composition.objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID]?.style
            .opacity,
        ),
        transform: `rotate(${Number(
          composition.objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID]?.style
            .rotateDeg ?? 0,
        )}deg)`,
        transformOrigin: "center",
        outline:
          selectedLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID
            ? "8px solid rgba(59, 130, 246, 0.75)"
            : "none",
        outlineOffset: 10,
      }}
      onClick={() => onSelectLayer?.(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID)}
    >
      {days.map((day, dayIndex) => {
        const entries = entriesByDay[day.id] ?? [];
        const component = componentByDayId[day.id];
        const entryCardSize = getEntryCardSize(day.id);
        const dayGeometry =
          dayCardGeometries[day.id] ??
          getStudioTimetableDayCardGeometry(
            dayCardsLayout,
            day.id,
            dayIndex,
            entries.length,
            entryCardSize,
          );
        const selected = selectedLayerId === `day-card:${day.id}`;

        return (
          <div
            className="absolute"
            data-node-id={`day-card:${day.id}`}
            key={day.id}
            style={{
              boxSizing: "border-box",
              left: dayGeometry.left - dayCardsBounds.left,
              top: dayGeometry.top - dayCardsBounds.top,
              width: dayGeometry.width,
              height: dayGeometry.height,
              outline: selected ? "8px solid rgba(59, 130, 246, 0.85)" : "none",
              outlineOffset: 8,
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectLayer?.(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onSelectLayer?.(`day-card:${day.id}`);
            }}
          >
            {entries.length > 0 ? (
              <div
                className="relative overflow-hidden"
                style={{ width: dayGeometry.width, height: dayGeometry.height }}
              >
                {(() => {
                  const statusId = resolveStudioTimetableDayVariantStatus(
                    document,
                    runtimeValues,
                    day.id,
                  );
                  const resolution = resolveStudioTimetableComponentVariant(
                    document,
                    component,
                    statusId,
                  );
                  const rootNode = resolution
                    ? document.graph.nodes[resolution.variant.rootNodeId]
                    : undefined;
                  const frame = getStudioTimetableComponentFrame(
                    document,
                    component,
                  );

                  return rootNode && resolution ? (
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        left: 0,
                        top: 0,
                        width: frame.width,
                        height: frame.height,
                      }}
                    >
                      <div
                        className="absolute"
                        style={{
                          left: -frame.left,
                          top: -frame.top,
                          pointerEvents: "none",
                          width: document.canvas.width,
                          height: document.canvas.height,
                        }}
                      >
                        <StudioRenderer
                          document={document}
                          rootNodeIds={[resolution.variant.rootNodeId]}
                          runtimeContext={{ dayId: day.id, entryIndex: 0 }}
                          runtimeValues={runtimeValues}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-md border border-dashed border-slate-300"
                      style={{ width: frame.width, height: frame.height }}
                    />
                  );
                })()}
              </div>
            ) : (
              <div
                className="rounded-md border border-dashed border-slate-300"
                style={{
                  width: entryCardSize.width,
                  height: entryCardSize.height,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTextObject = (object: StudioTimetableCompositionObject) => {
    const geometry = resolveStudioTimetableObjectGeometry(
      composition,
      object.id,
      previewSize,
    );
    const selected = selectedLayerId === object.id;
    const assetSlot = isArtistProfileTextObject(object)
      ? object.assetSlots?.asset
      : undefined;
    const asset = resolveTimetableAssetSlot(document, runtimeValues, assetSlot);
    const assetMode = getStringStyleValue(object.style, "assetMode", "visible");
    const assetPosition = getStringStyleValue(
      object.style,
      "assetPosition",
      "left",
    );
    const assetSize = Math.max(
      24,
      getNumericStyleValue(
        object.style,
        "assetSize",
        Math.min(160, geometry.height || 160),
      ),
    );
    const assetGap = Math.max(
      0,
      getNumericStyleValue(object.style, "assetGap", 32),
    );
    const shouldShowAsset = Boolean(asset?.src && assetMode !== "hidden");
    const text = resolveTimetableObjectText(document, runtimeValues, object);

    return (
      <div
        className="absolute overflow-hidden whitespace-pre-wrap"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(document, runtimeValues, object),
          flexDirection: assetPosition === "right" ? "row-reverse" : "row",
          gap: shouldShowAsset ? assetGap : undefined,
          outline: selected ? "8px solid rgba(59, 130, 246, 0.75)" : "none",
          outlineOffset: 8,
          minWidth: Math.max(1, geometry.width),
          minHeight: Math.max(1, geometry.height),
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectLayer?.(object.id);
        }}
      >
        {shouldShowAsset && asset?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Timetable preset assets are plain template asset URLs.
          <img
            alt={asset.label}
            className="shrink-0"
            draggable={false}
            src={asset.src}
            style={{
              width: assetSize,
              height: assetSize,
              objectFit: assetSlot?.fit ?? "contain",
            }}
          />
        ) : null}
        {object.kind === "flexibleText" ? (
          <AutoResizeText
            className="min-w-0"
            maxFontSize={getNumericStyleValue(object.style, "fontSize", 48)}
            minFontSize={8}
            multiline
            style={{ margin: 0 }}
          >
            {text}
          </AutoResizeText>
        ) : (
          <span className="min-w-0">{text}</span>
        )}
      </div>
    );
  };

  const renderProfileBlockObject = (
    object: StudioTimetableCompositionObject,
  ) => {
    const geometry = resolveStudioTimetableObjectGeometry(
      composition,
      object.id,
      previewSize,
    );
    const selected = selectedLayerId === object.id;
    const profileImageSlot = object.assetSlots?.profileImage;
    const profileFrameSlot = object.assetSlots?.profileFrame;
    const asset = resolveTimetableAssetSlot(
      document,
      runtimeValues,
      profileImageSlot,
    );
    const frameAsset = resolveTimetableAssetSlot(
      document,
      runtimeValues,
      profileFrameSlot,
    );

    return (
      <div
        className="absolute overflow-hidden"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(document, runtimeValues, object),
          outline: selected ? "8px solid rgba(59, 130, 246, 0.75)" : "none",
          outlineOffset: 8,
          minWidth: Math.max(1, geometry.width),
          minHeight: Math.max(1, geometry.height),
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectLayer?.(object.id);
        }}
      >
        {asset?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Timetable preset assets are plain template asset URLs.
          <img
            alt={asset.label}
            className="absolute inset-0 h-full w-full"
            draggable={false}
            src={asset.src}
            style={{ objectFit: profileImageSlot?.fit ?? "cover" }}
          />
        ) : (
          <div className="absolute inset-0 flex h-full w-full items-center justify-center text-[48px] font-extrabold text-slate-400">
            Profile
          </div>
        )}
        {frameAsset?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Timetable preset frame assets are plain template asset URLs.
          <img
            alt={frameAsset.label}
            className="pointer-events-none absolute inset-0 h-full w-full"
            draggable={false}
            src={frameAsset.src}
            style={{ objectFit: profileFrameSlot?.fit ?? "contain" }}
          />
        ) : null}
      </div>
    );
  };

  const renderTopObject = (object: StudioTimetableCompositionObject) => {
    const geometry = resolveStudioTimetableObjectGeometry(
      composition,
      object.id,
      previewSize,
    );
    const selected = selectedLayerId === object.id;
    const assetSlot = object.assetSlots?.asset;
    const asset = resolveTimetableAssetSlot(document, runtimeValues, assetSlot);

    return (
      <div
        className="absolute overflow-visible"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(document, runtimeValues, object),
          outline: selected ? "8px solid rgba(59, 130, 246, 0.75)" : "none",
          outlineOffset: 8,
          minWidth: Math.max(1, geometry.width),
          minHeight: Math.max(1, geometry.height),
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectLayer?.(object.id);
        }}
      >
        {asset?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Timetable preset assets are plain template asset URLs.
          <img
            alt={asset.label}
            className="absolute inset-0 h-full w-full"
            draggable={false}
            src={asset.src}
            style={{ objectFit: assetSlot?.fit ?? "contain" }}
          />
        ) : (
          <div className="absolute inset-0 flex h-full w-full items-center justify-center border border-dashed border-slate-300 text-[42px] font-extrabold text-slate-400">
            Top Object
          </div>
        )}
      </div>
    );
  };

  const renderImageObject = (object: StudioTimetableCompositionObject) => {
    const geometry = resolveStudioTimetableObjectGeometry(
      composition,
      object.id,
      previewSize,
    );
    const selected = selectedLayerId === object.id;
    const assetSlot = object.assetSlots?.asset;
    const asset = resolveTimetableAssetSlot(document, runtimeValues, assetSlot);

    return (
      <div
        className="absolute"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(document, runtimeValues, object),
          outline: selected ? "8px solid rgba(59, 130, 246, 0.75)" : "none",
          outlineOffset: 8,
          minWidth: Math.max(1, geometry.width),
          minHeight: Math.max(1, geometry.height),
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectLayer?.(object.id);
        }}
      >
        {asset?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Timetable composition images use template asset and runtime input URLs.
          <img
            alt={asset.label}
            className="pointer-events-none absolute inset-0 h-full w-full"
            draggable={false}
            src={asset.src}
            style={{ objectFit: assetSlot?.fit ?? "contain" }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-slate-200/40 px-4 text-center text-[28px] font-bold text-slate-400">
            {object.label}
          </div>
        )}
      </div>
    );
  };

  const renderCompositionObject = (
    objectId: string,
    visitedObjectIds = new Set<string>(),
  ): React.ReactNode => {
    if (visitedObjectIds.has(objectId)) return null;
    const object = composition.objects[objectId];
    if (!object || object.hidden) return null;

    if (object.kind === "generatedDayCards") return renderDayCardsObject();
    if (object.kind === "profileBlock") {
      return renderProfileBlockObject(object);
    }
    if (object.kind === "topObject") return renderTopObject(object);
    if (object.kind === "image") return renderImageObject(object);
    if (object.kind !== "group") return renderTextObject(object);

    const geometry = resolveStudioTimetableObjectGeometry(
      composition,
      object.id,
      previewSize,
    );
    const selected = selectedLayerId === object.id;
    const nextVisitedObjectIds = new Set(visitedObjectIds);
    nextVisitedObjectIds.add(object.id);

    return (
      <div
        className="absolute overflow-visible"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(document, runtimeValues, object),
          outline: selected ? "8px solid rgba(59, 130, 246, 0.75)" : "none",
          outlineOffset: 8,
          minWidth: Math.max(1, geometry.width),
          minHeight: Math.max(1, geometry.height),
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectLayer?.(object.id);
        }}
      >
        {getStudioPaintOrder(
          getStudioTimetableObjectRenderableChildIds(
            object,
            variantMode === "runtime"
              ? getStudioTimetableObjectRuntimeVariantValue(
                  document,
                  runtimeValues,
                  object,
                )
              : undefined,
          ),
        ).map((childId) =>
          renderCompositionObject(childId, nextVisitedObjectIds),
        )}
      </div>
    );
  };

  return (
    <div
      className="relative overflow-hidden bg-[#eef2f7] text-[#172033]"
      style={{
        backgroundColor: timetable?.canvas?.backgroundColor ?? "#eef2f7",
        width: previewSize.width,
        height: previewSize.height,
      }}
    >
      <StudioWebFontLoader document={document} />
      {getStudioPaintOrder(composition.rootObjectIds).map((objectId) =>
        renderCompositionObject(objectId),
      )}
    </div>
  );
}
