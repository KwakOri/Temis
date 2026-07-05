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
  StudioTimetableDomain,
  StudioTimetableAssetSlot,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import { resolveStudioTextBinding } from "@/utils/template-studio/binding-resolver";
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
  Math.max(1, entryCount) * layout.entryPreviewHeight +
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

const getStringStyleValue = (
  styleRecord: StudioStyleRecord | undefined,
  key: string,
  fallback: string,
) => {
  const value = styleRecord?.[key];
  return typeof value === "string" ? value : fallback;
};

const parseIsoDateParts = (value: string | undefined) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
};

const getDatePartsWithDayOffset = (
  value: string | undefined,
  offset: number,
) => {
  const parts = parseIsoDateParts(value);
  if (!parts) return null;

  const date = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day) + offset,
    ),
  );

  return {
    year: String(date.getUTCFullYear()).padStart(4, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
};

const formatDateParts = (
  parts: ReturnType<typeof parseIsoDateParts>,
  options: { includeYear: boolean },
) => {
  if (!parts) return "";
  return options.includeYear
    ? `${parts.year}.${parts.month}.${parts.day}`
    : `${parts.month}.${parts.day}`;
};

const formatLocalizedDateParts = (
  parts: ReturnType<typeof parseIsoDateParts>,
  options: { includeYear: boolean },
) => {
  if (!parts) return "";
  const date = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: options.includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
  return formatter.format(date);
};

const getWeekStartParts = (document: StudioTemplateDocument) =>
  parseIsoDateParts(document.domains?.timetable?.week?.startDate);

const getWeekEndParts = (document: StudioTemplateDocument) => {
  const timetable = document.domains?.timetable;
  const explicitEndParts = parseIsoDateParts(timetable?.week?.endDate);
  if (explicitEndParts) return explicitEndParts;

  if (!timetable?.week?.startDate) return null;
  return getDatePartsWithDayOffset(
    timetable.week.startDate,
    Math.max(0, timetable.dayIds.length - 1),
  );
};

const isWeekDatesObject = (object: StudioTimetableCompositionObject) =>
  object.presetId === "weekDates" ||
  object.meta?.exception?.semanticKey === "weekDates";

const resolveWeekDatesText = (
  document: StudioTemplateDocument,
  object: StudioTimetableCompositionObject,
) => {
  const start = getWeekStartParts(document);
  const end = getWeekEndParts(document);
  if (!start && !end) return "";

  const format = getStringStyleValue(
    object.style,
    "dateRangeFormat",
    "long",
  );
  const first = start ?? end;
  const last = end ?? start;

  if (format === "short") {
    return `${formatDateParts(first, { includeYear: false })} - ${formatDateParts(
      last,
      { includeYear: false },
    )}`;
  }

  if (format === "localized") {
    return `${formatLocalizedDateParts(first, {
      includeYear: false,
    })} - ${formatLocalizedDateParts(last, { includeYear: true })}`;
  }

  if (format === "split") {
    return `${formatDateParts(first, { includeYear: true })}\n${formatDateParts(
      last,
      { includeYear: false },
    )}`;
  }

  return `${formatDateParts(first, { includeYear: true })} - ${formatDateParts(
    last,
    { includeYear: false },
  )}`;
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
  if (isWeekDatesObject(object)) {
    return resolveWeekDatesText(document, object) || object.label;
  }

  const value = resolveStudioTextBinding(
    document,
    runtimeValues,
    object.binding,
  );
  return value || object.label;
};

const isArtistProfileTextObject = (
  object: StudioTimetableCompositionObject,
) =>
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

const getTimetableObjectStyle = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  object: StudioTimetableCompositionObject,
): React.CSSProperties => {
  const { rotateDeg, ...styleRecord } = object.style;
  delete styleRecord.dateRangeFormat;
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
    backgroundFit === "fill"
      ? "100% 100%"
      : (backgroundFit ?? "cover");

  return {
    ...styleRecord,
    position: "absolute",
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
            className="absolute grid content-start"
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

                  return (
                    <div key={entry.id}>
                      {rootNode && resolution ? (
                        <div
                          className="relative mx-auto overflow-hidden"
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
                        <div className="h-[92px] rounded-md border border-dashed border-slate-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-md border border-dashed border-slate-300"
                style={{ height: dayCardsLayout.entryPreviewHeight }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTextObject = (object: StudioTimetableCompositionObject) => {
    const geometry = getStudioTimetableCompositionObjectGeometry(object);
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
      getNumericStyleValue(object.style, "assetSize", Math.min(160, geometry.height || 160)),
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
        <span className="min-w-0">{text}</span>
      </div>
    );
  };

  const renderProfileBlockObject = (
    object: StudioTimetableCompositionObject,
  ) => {
    const geometry = getStudioTimetableCompositionObjectGeometry(object);
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
    const geometry = getStudioTimetableCompositionObjectGeometry(object);
    const selected = selectedLayerId === object.id;
    const assetSlot = object.assetSlots?.asset;
    const asset = resolveTimetableAssetSlot(
      document,
      runtimeValues,
      assetSlot,
    );

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
        if (object.hidden) return null;

        if (object.kind === "generatedDayCards") {
          return renderDayCardsObject();
        }

        if (object.kind === "profileBlock") {
          return renderProfileBlockObject(object);
        }

        if (object.kind === "topObject") {
          return renderTopObject(object);
        }

        return renderTextObject(object);
      })}
    </div>
  );
}
