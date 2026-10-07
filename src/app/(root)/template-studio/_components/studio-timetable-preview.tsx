"use client";

import React, { useMemo } from "react";
import type { StudioTimetableGraphNode } from "@/types/studio-timetable-graph";
import {
  requireStudioTimetableGraphDocument,
  resolveStudioTimetableGraphGeometry,
} from "@/utils/template-studio/timetable-graph-commands";
import {
  getStudioTimetableNodeStyle,
  getStudioTimetableNodeExtension,
  getStudioTimetableNodeAsset,
  getStudioTimetableNodeChildIds,
  getStudioTimetableNodeRuntimeVariant,
} from "@/utils/template-studio/timetable-graph-queries";

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
  StudioAssetSlot,
  StudioTimetableComponentDefinition,
} from "@/types/template-studio";
import {
  resolveStudioAssetSlot,
  resolveStudioTextBinding,
} from "@/utils/template-studio/binding-resolver";
import { getStudioTimetableDayComponent } from "@/utils/template-studio/component-sets";
import { getStudioPaintOrder } from "@/utils/template-studio/layer-order";
import {
  getLocalizedStudioPresetDefaultText,
  getStudioRuntimeCopy,
  type StudioRuntimeCopy,
  type StudioRuntimeLocale,
} from "@/utils/template-studio/runtime-i18n";
import { getStudioObjectRenderStyle } from "@/utils/template-studio/object-layout";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "@/utils/template-studio/timetable-graph-presets";
import {
  getStudioTimetableEntriesForDay,
  resolveStudioTimetableComponentVariant,
} from "@/utils/template-studio/timetable-runtime";
import { createStudioStatusCardBackgroundSlotResolver } from "@/utils/template-studio/status-card-background";
import { resolveStudioTextAppearance } from "@/utils/template-studio/text-appearance";
import {
  getStudioTimetableComponentFrame,
  resolveStudioTimetableDayVariantStatus,
} from "@/utils/template-studio/entry-groups";
import {
  getStudioObjectCssStyle,
  getStudioBackgroundSizeForFit,
  getStudioCssOpacity,
} from "@/utils/template-studio/object-style";

import { StudioText } from "@/components/studio/text/studio-text";
import { StudioWebFontLoader } from "@/components/studio/canvas/studio-web-font-loader";
import {
  getStudioDefaultFontFamily,
  resolveStudioFontFamily,
} from "@/utils/template-studio/web-fonts";

import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import { StudioTeamCards } from "./studio-team-cards";

import {
  getStudioTimetableEditingVariantValue,
  type StudioTimetableEditingVariants,
} from "@/utils/template-studio/timetable-selection";

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

export const getStudioTimetableRotatedRectangleBounds = (
  rectangle: StudioTimetableDayCardGeometry,
  rotateDeg = 0,
): StudioTimetableDayCardGeometry => {
  const radians = (rotateDeg * Math.PI) / 180;
  const width =
    Math.abs(rectangle.width * Math.cos(radians)) +
    Math.abs(rectangle.height * Math.sin(radians));
  const height =
    Math.abs(rectangle.width * Math.sin(radians)) +
    Math.abs(rectangle.height * Math.cos(radians));

  return {
    left: rectangle.left + (rectangle.width - width) / 2,
    top: rectangle.top + (rectangle.height - height) / 2,
    width,
    height,
  };
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
  timetable?: Pick<StudioTimetableDomain, "dayIds" | "dayCardsLayout">,
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
  if (layout.gridPreset === "custom") {
    return {
      left: offset.left,
      top: offset.top,
      width: entryCardSize.width,
      height: getStudioTimetableDayCardHeight(
        layout,
        entryCount,
        entryCardSize,
      ),
    };
  }
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
    StudioTimetableEntryCardSize | StudioTimetableEntryCardSizeResolver,
) => {
  const size =
    typeof entryCardSizeOrResolver === "function"
      ? entryCardSizeOrResolver(dayId)
      : entryCardSizeOrResolver;
  const fallback = getFallbackEntryCardSize(layout);

  return {
    width: Math.max(
      1,
      Number.isFinite(size?.width) ? size.width : fallback.width,
    ),
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
  if (layout.gridPreset === "custom") {
    return Object.fromEntries(
      days.map((day, index) => [
        day.id,
        getStudioTimetableDayCardGeometry(
          layout,
          day.id,
          index,
          getEntryCount(day.id),
          resolveEntryCardSize(layout, day.id, entryCardSizeOrResolver),
        ),
      ]),
    );
  }
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
          left:
            getTrackOrigin(
              layout.left,
              columnWidths,
              position.column,
              columnGap,
            ) + offset.left,
          top:
            getTrackOrigin(layout.top, rowHeights, position.row, rowGap) +
            offset.top,
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
  canvasSize = STUDIO_TIMETABLE_DEFAULT_CANVAS_SIZE,
) => {
  if (layout.gridPreset === "custom")
    return {
      left: 0,
      top: 0,
      width: canvasSize.width,
      height: canvasSize.height,
    };
  const geometries = getStudioTimetableDayCardGeometries(
    layout,
    days,
    getEntryCount,
    entryCardSizeOrResolver,
  );
  if (Object.keys(geometries).length === 0) {
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

  const visualGeometries = Object.entries(geometries).map(([dayId, geometry]) =>
    getStudioTimetableRotatedRectangleBounds(
      geometry,
      layout.dayOffsets?.[dayId]?.rotateDeg ?? 0,
    ),
  );
  const left = Math.min(...visualGeometries.map((geometry) => geometry.left));
  const top = Math.min(...visualGeometries.map((geometry) => geometry.top));
  const right = Math.max(
    ...visualGeometries.map((geometry) => geometry.left + geometry.width),
  );
  const bottom = Math.max(
    ...visualGeometries.map((geometry) => geometry.top + geometry.height),
  );

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
};

const getNumericStyleValue = (
  style: StudioStyleRecord | undefined,
  key: string,
  fallback: number,
) => (typeof style?.[key] === "number" ? (style[key] as number) : fallback);

const resolveTimetableObjectText = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableGraphNode,
  copy: StudioRuntimeCopy,
) => {
  const value = resolveStudioTextBinding(
    document,
    runtimeValues,
    object.binding,
  );
  if (!value && object.binding?.kind === "inputText") {
    const input = document.inputs[object.binding.inputId];
    return input?.type === "text" ? (input.placeholder ?? "") : "";
  }
  return getLocalizedStudioPresetDefaultText(copy, value || object.label);
};

const isStudioProfileImageDefaultAsset = (
  document: StudioTemplateDocument,
  slot: StudioAssetSlot | undefined,
  asset: StudioAsset | null,
) => {
  if (!slot?.inputId || !asset?.src) return false;

  const input = document.inputs[slot.inputId];
  return input?.type === "image" && input.defaultUrl === asset.src;
};

const getTimetableObjectStyle = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableGraphNode,
  defaultFontFamily: string | null,
): React.CSSProperties => {
  const resolvedStyle = getStudioObjectRenderStyle(
    getStudioTimetableNodeStyle(document, object),
    object.layoutMode,
  );
  const styleRecord = getStudioObjectCssStyle(resolvedStyle, {
    legacyTimetable: true,
  });
  if (object.type === "text" || object.type === "flexibleText") {
    styleRecord.fontFamily = resolveStudioFontFamily(
      document,
      resolvedStyle.fontFamily,
      defaultFontFamily,
    );
  }
  const backgroundSlot = object.assetSlots?.asset;
  const backgroundAsset = resolveStudioAssetSlot(
    document,
    runtimeValues,
    backgroundSlot,
  );
  const backgroundFit = backgroundSlot?.fit;
  const backgroundSize = getStudioBackgroundSizeForFit(backgroundFit);

  return {
    ...styleRecord,
    backgroundImage: backgroundAsset
      ? `url(${JSON.stringify(backgroundAsset.src)})`
      : undefined,
    backgroundPosition: backgroundAsset ? "center" : undefined,
    backgroundRepeat: backgroundAsset ? "no-repeat" : undefined,
    backgroundSize: backgroundAsset ? backgroundSize : undefined,
  } as React.CSSProperties;
};

interface StudioTimetablePreviewProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
  variantMode?: "authoring" | "runtime";
  editingVariants?: StudioTimetableEditingVariants;
  locale?: StudioRuntimeLocale;
}

export function StudioTimetablePreview({
  document: sourceDocument,
  runtimeValues,
  selectedLayerId = null,
  onSelectLayer,
  variantMode = "runtime",
  editingVariants = {},
  locale = "en",
}: StudioTimetablePreviewProps) {
  const document = requireStudioTimetableGraphDocument(sourceDocument);
  const defaultFontFamily = getStudioDefaultFontFamily(document) ?? null;
  const timetable = document.domains?.timetable;
  const copy = getStudioRuntimeCopy(locale);
  // 상태 카드 배경은 지금 상태에 따라 그림 자리가 달라진다. 이 판단은 시간표에서
  // 온 개념이므로 공통 렌더러가 아니라 도메인이 만들어 넘긴다.
  const resolveCardBackgroundAssetSlot = useMemo(
    () => createStudioStatusCardBackgroundSlotResolver(document, runtimeValues),
    [document, runtimeValues],
  );
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
  const generator = document.graph.nodes[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID];
  const generatorStyle = generator
    ? getStudioTimetableNodeStyle(document, generator)
    : {};
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
    previewSize,
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
        opacity: getStudioCssOpacity(generatorStyle.opacity),
        transform: `rotate(${Number(generatorStyle.rotateDeg ?? 0)}deg)`,
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
              transform: `rotate(${Number(
                dayCardsLayout.dayOffsets?.[day.id]?.rotateDeg ?? 0,
              )}deg)`,
              transformOrigin: "center",
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
                style={{
                  width: dayGeometry.width,
                  height: dayGeometry.height,
                }}
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
                          resolveNodeBackgroundAssetSlot={
                            resolveCardBackgroundAssetSlot
                          }
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

  const renderTextObject = (object: StudioTimetableGraphNode) => {
    const geometry = resolveStudioTimetableGraphGeometry(document, object.id);
    const selected = selectedLayerId === object.id;
    const style = getStudioTimetableNodeStyle(document, object);
    const inline = getStudioTimetableNodeExtension(
      document,
      object.id,
    ).inlineAssetLayout;
    const assetSlot = object.assetSlots?.inlineDecoration;
    const asset = resolveStudioAssetSlot(document, runtimeValues, assetSlot);
    const assetMode = inline?.mode ?? "visible";
    const assetPosition = inline?.position ?? "left";
    const assetSize = Math.max(
      24,
      inline?.size ?? Math.min(160, geometry.height || 160),
    );
    const assetGap = Math.max(0, inline?.gap ?? 32);
    const shouldShowAsset = Boolean(asset?.src && assetMode !== "hidden");
    const text = resolveTimetableObjectText(
      document,
      runtimeValues,
      object,
      copy,
    );

    return (
      <div
        className="absolute overflow-hidden whitespace-pre-wrap"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(
            document,
            runtimeValues,
            object,
            defaultFontFamily,
          ),
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
        {object.type === "flexibleText" ? (
          <StudioText
            appearance={resolveStudioTextAppearance({}, style)}
            autoFit={{
              maxFontSize:
                typeof style.fontSize === "number" ? style.fontSize : 48,
              minFontSize: 8,
              styleRecord: style,
            }}
            className="min-w-0"
            text={text}
            typography={{
              margin: 0,
              fontFamily: resolveStudioFontFamily(
                document,
                style.fontFamily,
                defaultFontFamily,
              ),
            }}
          />
        ) : (
          <span className="min-w-0">{text}</span>
        )}
      </div>
    );
  };

  const renderImageObject = (object: StudioTimetableGraphNode) => {
    const geometry = resolveStudioTimetableGraphGeometry(document, object.id);
    const selected = selectedLayerId === object.id;
    const assetSlot = getStudioTimetableNodeAsset(object);
    const asset = resolveStudioAssetSlot(document, runtimeValues, assetSlot);
    const isProfileUserImage =
      getStudioTimetableNodeExtension(document, object.id).profileRole ===
      "userImage";
    const renderAsset =
      variantMode === "runtime" &&
      isProfileUserImage &&
      isStudioProfileImageDefaultAsset(document, assetSlot, asset)
        ? null
        : asset;

    return (
      <div
        className="absolute"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(
            document,
            runtimeValues,
            object,
            defaultFontFamily,
          ),
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
        {renderAsset?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Timetable composition images use template asset and runtime input URLs.
          <img
            alt={renderAsset.label}
            className="pointer-events-none absolute inset-0 h-full w-full"
            draggable={false}
            src={renderAsset.src}
            style={{ objectFit: assetSlot?.fit ?? "contain" }}
          />
        ) : variantMode === "authoring" || !isProfileUserImage ? (
          <div className="pointer-events-none absolute inset-0 flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-slate-200/40 px-4 text-center text-[28px] font-bold text-slate-400">
            {object.label}
          </div>
        ) : null}
      </div>
    );
  };

  const renderCompositionObject = (
    objectId: string,
    visitedObjectIds = new Set<string>(),
  ): React.ReactNode => {
    if (visitedObjectIds.has(objectId)) return null;
    const object = document.graph.nodes[objectId];
    if (!object || object.hidden) return null;

    if (getStudioTimetableNodeExtension(document, object.id).generator)
      return timetable.team ? (
        <StudioTeamCards
          key={object.id}
          document={document}
          runtimeValues={runtimeValues}
          selected={selectedLayerId === object.id}
          onSelect={() => onSelectLayer?.(object.id)}
        />
      ) : (
        renderDayCardsObject()
      );
    if (object.type === "image") return renderImageObject(object);
    if (object.type !== "group") return renderTextObject(object);

    const geometry = resolveStudioTimetableGraphGeometry(document, object.id);
    const selected = selectedLayerId === object.id;
    const nextVisitedObjectIds = new Set(visitedObjectIds);
    nextVisitedObjectIds.add(object.id);

    return (
      <div
        className="absolute overflow-visible"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(
            document,
            runtimeValues,
            object,
            defaultFontFamily,
          ),
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
          getStudioTimetableNodeChildIds(
            object,
            variantMode === "runtime"
              ? getStudioTimetableNodeRuntimeVariant(
                  document,
                  runtimeValues,
                  object,
                )
              : getStudioTimetableEditingVariantValue(object, editingVariants),
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
      {getStudioPaintOrder(document.domains.timetable.rootNodeIds).map(
        (objectId) => renderCompositionObject(objectId),
      )}
    </div>
  );
}
