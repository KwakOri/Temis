"use client";

import React, { useMemo } from "react";

import {
  StudioTimetableDayDefinition,
  StudioTimetableDayId,
  StudioGraphNode,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableDayCardsLayout,
  StudioTimetableDomain,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import { getStudioRuntimeInputValue } from "@/utils/template-studio/input-values";
import {
  getStudioTimetableComposition,
  getStudioTimetableCompositionObjectGeometry,
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
} from "@/utils/template-studio/timetable-composition";
import {
  getStudioTimetableEntriesForDay,
  resolveStudioTimetableComponentVariant,
} from "@/utils/template-studio/timetable-runtime";

import { StudioRenderer } from "./studio-renderer";

export const STUDIO_TIMETABLE_DEFAULT_CANVAS_SIZE = {
  width: 4000,
  height: 2250,
};

export const STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT = {
  left: 434,
  top: 760,
  dayWidth: 420,
  dayGap: 32,
  padding: 28,
  headerHeight: 76,
  entryPreviewWidth: 360,
  entryPreviewHeight: 212,
  entryGap: 24,
} satisfies StudioTimetableDayCardsLayout;

const DAY_CARD_HEADER_GAP = 24;
const DAY_CARD_ENTRY_META_HEIGHT = 28;
const DAY_CARD_ENTRY_META_GAP = 6;

export const getStudioTimetablePreviewSize = (
  timetable?: StudioTimetableDomain,
) => ({
  width: timetable?.canvas?.width ?? STUDIO_TIMETABLE_DEFAULT_CANVAS_SIZE.width,
  height:
    timetable?.canvas?.height ?? STUDIO_TIMETABLE_DEFAULT_CANVAS_SIZE.height,
});

export const getStudioTimetableDayCardsLayout = (
  timetable?: StudioTimetableDomain,
): StudioTimetableDayCardsLayout => ({
  ...STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
  ...(timetable?.dayCardsLayout ?? {}),
  dayOffsets: {
    ...(timetable?.dayCardsLayout?.dayOffsets ?? {}),
  },
});

export const getStudioTimetableDayCardHeight = (
  layout: StudioTimetableDayCardsLayout,
  entryCount: number,
) =>
  layout.padding * 2 +
  layout.headerHeight +
  DAY_CARD_HEADER_GAP +
  Math.max(1, entryCount) *
    (DAY_CARD_ENTRY_META_HEIGHT +
      DAY_CARD_ENTRY_META_GAP +
      layout.entryPreviewHeight) +
  Math.max(0, entryCount - 1) * layout.entryGap;

export const getStudioTimetableDayCardGeometry = (
  layout: StudioTimetableDayCardsLayout,
  dayId: StudioTimetableDayId,
  dayIndex: number,
  entryCount: number,
) => {
  const offset = layout.dayOffsets?.[dayId] ?? { left: 0, top: 0 };

  return {
    left:
      layout.left + dayIndex * (layout.dayWidth + layout.dayGap) + offset.left,
    top: layout.top + offset.top,
    width: layout.dayWidth,
    height: getStudioTimetableDayCardHeight(layout, entryCount),
  };
};

export const getStudioTimetableDayCardsBounds = (
  layout: StudioTimetableDayCardsLayout,
  days: StudioTimetableDayDefinition[],
  getEntryCount: (dayId: StudioTimetableDayId) => number,
) => ({
  left: layout.left,
  top: layout.top,
  width:
    Math.max(1, days.length) * layout.dayWidth +
    Math.max(0, days.length - 1) * layout.dayGap,
  height: Math.max(
    ...days.map((day) =>
      getStudioTimetableDayCardHeight(layout, getEntryCount(day.id)),
    ),
    getStudioTimetableDayCardHeight(layout, 1),
  ),
});

const getNumericStyleValue = (
  styleRecord: StudioStyleRecord | undefined,
  key: string,
  fallback: number,
) => {
  const value = styleRecord?.[key];
  return typeof value === "number" ? value : fallback;
};

const getEntryPreviewGeometry = (
  document: StudioTemplateDocument,
  rootNode: StudioGraphNode | undefined,
  previewWidth: number,
  previewHeight: number,
) => {
  const rootStyle = rootNode?.styleId
    ? document.styles[rootNode.styleId]
    : undefined;
  const rootLeft = getNumericStyleValue(rootStyle, "left", 0);
  const rootTop = getNumericStyleValue(rootStyle, "top", 0);
  const rootWidth = getNumericStyleValue(
    rootStyle,
    "width",
    document.canvas.width,
  );
  const rootHeight = getNumericStyleValue(
    rootStyle,
    "height",
    document.canvas.height,
  );
  const entryScale = Math.min(
    previewWidth / Math.max(1, rootWidth),
    previewHeight / Math.max(1, rootHeight),
  );

  return {
    entryScale,
    rootLeft,
    rootTop,
    scaledEntryWidth: rootWidth * entryScale,
    scaledEntryHeight: rootHeight * entryScale,
  };
};

const resolveTimetableObjectText = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableCompositionObject,
) => {
  if (object.binding?.kind === "staticText") return object.binding.value;

  if (object.binding?.kind === "inputText") {
    const input = document.inputs[object.binding.inputId];
    if (input?.type === "text") {
      return getStudioRuntimeInputValue(input, runtimeValues);
    }
  }

  return object.label;
};

const getTimetableObjectStyle = (
  object: StudioTimetableCompositionObject,
): React.CSSProperties => {
  const { rotateDeg, ...styleRecord } = object.style;

  return {
    ...styleRecord,
    position: "absolute",
    transform:
      typeof rotateDeg === "number" ? `rotate(${rotateDeg}deg)` : undefined,
  } as React.CSSProperties;
};

interface StudioTimetablePreviewProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
}

export function StudioTimetablePreview({
  document,
  runtimeValues,
  selectedLayerId = null,
  onSelectLayer,
}: StudioTimetablePreviewProps) {
  const timetable = document.domains?.timetable;
  const days = useMemo(() => {
    if (!timetable) return [];
    return timetable.dayIds
      .map((dayId) => timetable.days[dayId])
      .filter(Boolean);
  }, [timetable]);
  const component = timetable
    ? timetable.components[timetable.entryComponentId]
    : undefined;
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
  const dayCardsBounds = getStudioTimetableDayCardsBounds(
    dayCardsLayout,
    days,
    (dayId) => entriesByDay[dayId]?.length ?? 0,
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
        const dayGeometry = getStudioTimetableDayCardGeometry(
          dayCardsLayout,
          day.id,
          dayIndex,
          entries.length,
        );
        const selected = selectedLayerId === `day-card:${day.id}`;

        return (
          <div
            className="absolute grid content-start rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_64px_rgba(15,23,42,0.12)]"
            data-node-id={`day-card:${day.id}`}
            key={day.id}
            style={{
              boxSizing: "border-box",
              left: dayGeometry.left - dayCardsBounds.left,
              top: dayGeometry.top - dayCardsBounds.top,
              width: dayGeometry.width,
              minHeight: dayGeometry.height,
              padding: dayCardsLayout.padding,
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
            <div
              className="flex items-baseline justify-between border-b border-slate-100"
              style={{
                height: dayCardsLayout.headerHeight,
                marginBottom: DAY_CARD_HEADER_GAP,
              }}
            >
              <span className="text-[30px] font-extrabold">
                {day.shortLabel}
              </span>
              <span className="text-[18px] font-bold uppercase tracking-[0.08em] text-slate-400">
                {day.label}
              </span>
            </div>

            {entries.length > 0 ? (
              <div style={{ display: "grid", gap: dayCardsLayout.entryGap }}>
                {entries.map((entry, entryIndex) => {
                  const resolution = resolveStudioTimetableComponentVariant(
                    document,
                    component,
                    entry.statusId,
                  );
                  const rootNode = resolution
                    ? document.graph.nodes[resolution.variant.rootNodeId]
                    : undefined;
                  const geometry = getEntryPreviewGeometry(
                    document,
                    rootNode,
                    dayCardsLayout.entryPreviewWidth,
                    dayCardsLayout.entryPreviewHeight,
                  );
                  const statusLabel =
                    timetable?.statuses[entry.statusId]?.label ??
                    entry.statusId;
                  const resolvedStatusLabel = resolution
                    ? (timetable?.statuses[resolution.resolvedStatusId]
                        ?.label ?? resolution.resolvedStatusId)
                    : "";

                  return (
                    <div className="grid gap-1.5" key={entry.id}>
                      <div
                        className="flex items-center justify-between text-[18px] font-bold text-slate-400"
                        style={{ height: DAY_CARD_ENTRY_META_HEIGHT }}
                      >
                        <span>Entry {entryIndex + 1}</span>
                        <span>
                          {resolution?.isFallback
                            ? `${statusLabel} -> ${resolvedStatusLabel}`
                            : statusLabel}
                        </span>
                      </div>
                      {rootNode && resolution ? (
                        <div
                          className="relative mx-auto overflow-hidden rounded-md bg-slate-50"
                          style={{
                            width: dayCardsLayout.entryPreviewWidth,
                            height: dayCardsLayout.entryPreviewHeight,
                          }}
                        >
                          <div
                            className="absolute origin-top-left"
                            style={{
                              left: -geometry.rootLeft * geometry.entryScale,
                              top: -geometry.rootTop * geometry.entryScale,
                              pointerEvents: "none",
                              transform: `scale(${geometry.entryScale})`,
                              width: document.canvas.width,
                              height: document.canvas.height,
                            }}
                          >
                            <StudioRenderer
                              document={document}
                              rootNodeIds={[resolution.variant.rootNodeId]}
                              runtimeContext={{
                                dayId: day.id,
                                entryIndex,
                              }}
                              runtimeValues={runtimeValues}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-[92px] items-center justify-center rounded-md border border-dashed border-slate-300 text-xs font-bold text-slate-400">
                          Empty
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-md border border-dashed border-slate-300 text-xl font-bold text-slate-400"
                style={{ height: dayCardsLayout.entryPreviewHeight }}
              >
                Empty
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTextObject = (object: StudioTimetableCompositionObject) => {
    const geometry = getStudioTimetableCompositionObjectGeometry(object);
    const selected = selectedLayerId === object.id;

    return (
      <div
        className="absolute overflow-hidden whitespace-pre-wrap"
        data-node-id={object.id}
        key={object.id}
        style={{
          ...getTimetableObjectStyle(object),
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
        {resolveTimetableObjectText(document, runtimeValues, object)}
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
      {composition.rootObjectIds.map((objectId) => {
        const object = composition.objects[objectId];
        if (!object) return null;

        if (object.kind === "generatedDayCards") {
          return renderDayCardsObject();
        }

        return renderTextObject(object);
      })}
    </div>
  );
}
