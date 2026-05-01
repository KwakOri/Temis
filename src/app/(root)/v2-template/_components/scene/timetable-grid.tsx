import React from "react";

import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRuntimeData } from "@/contexts/v2/template-runtime-ui-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  V2TemplateCardInstanceTransform,
  V2TemplateDayKey,
  V2TemplateTimetableCardComponent,
  V2TemplateTimetableCardState,
  V2TemplateTimetableCardStatusKey,
  v2_TEMPLATE_DAY_KEYS,
} from "@/types/time-table/template-render-config";
import { v2_parseDayKey } from "@/utils/v2/template-render-config";
import { v2_isLayerHiddenByAliases } from "@/utils/v2/layer-visibility";
import V2TimeTableCell from "./card-cell";
import { v2_getHighlightStyle } from "./highlight-style";
import { v2_toRenderableLayoutStyle } from "./render-style";

type V2TimetableSlotTransform = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotateDeg: number;
  scale: number;
  opacity: number;
};

const v2_resolveSlotTransform = (
  transform?: V2TemplateCardInstanceTransform
): V2TimetableSlotTransform => {
  const x =
    typeof transform?.offsetX === "number" && Number.isFinite(transform.offsetX)
      ? transform.offsetX
      : 0;
  const y =
    typeof transform?.offsetY === "number" && Number.isFinite(transform.offsetY)
      ? transform.offsetY
      : 0;
  const width =
    typeof transform?.width === "number" &&
    Number.isFinite(transform.width) &&
    transform.width > 0
      ? transform.width
      : undefined;
  const height =
    typeof transform?.height === "number" &&
    Number.isFinite(transform.height) &&
    transform.height > 0
      ? transform.height
      : undefined;
  const rotateDeg =
    typeof transform?.rotateDeg === "number" &&
    Number.isFinite(transform.rotateDeg)
      ? transform.rotateDeg
      : 0;
  const scale =
    typeof transform?.scale === "number" && Number.isFinite(transform.scale)
      ? Math.max(0.1, transform.scale)
      : 1;
  const opacity =
    typeof transform?.opacity === "number" && Number.isFinite(transform.opacity)
      ? Math.min(1, Math.max(0, transform.opacity))
      : 1;

  return { x, y, width, height, rotateDeg, scale, opacity };
};

const v2_getGridEditorAttributes = ({
  layerId,
  dragKind,
  dayKey,
}: {
  layerId: string;
  dragKind: "grid" | "timetableSlot";
  dayKey?: V2TemplateDayKey;
}): React.HTMLAttributes<HTMLElement> => {
  return {
    "data-v2-editor-layer-id": layerId,
    "data-v2-editor-highlight-target": "grid",
    "data-v2-editor-drag-kind": dragKind,
    ...(dayKey ? { "data-v2-editor-day-key": dayKey } : {}),
  } as React.HTMLAttributes<HTMLElement>;
};

const v2_resolveTimetableStatus = ({
  isOffline,
  entryCount,
  hasOfflineMemo,
  multiEnabled,
  offlineMemoEnabled,
}: {
  isOffline: boolean;
  entryCount: number;
  hasOfflineMemo: boolean;
  multiEnabled: boolean;
  offlineMemoEnabled: boolean;
}): V2TemplateTimetableCardStatusKey => {
  if (isOffline) {
    return hasOfflineMemo && offlineMemoEnabled ? "offlineMemo" : "offline";
  }
  return entryCount >= 2 && multiEnabled ? "multi" : "online";
};

const v2_getStateForStatus = (
  component: V2TemplateTimetableCardComponent,
  status: V2TemplateTimetableCardStatusKey
): V2TemplateTimetableCardState => {
  if (status === "offlineMemo") {
    return component.states.offlineMemo ?? component.states.offline;
  }
  if (status === "multi") {
    return component.states.multi ?? component.states.online;
  }
  return component.states[status];
};

const V2TimetableGrid: React.FC<{ gridLayerId?: string }> = ({ gridLayerId }) => {
  const {
    data,
    currentTheme,
    hoverHighlightTarget,
    activeHighlightTarget,
    hiddenLayerIds,
  } = useTemplateRuntimeContext();
  const { weekDates } = useTemplateRuntimeData();
  const { renderConfig } = useTemplateRenderConfigContext();
  const timetable = renderConfig.timetable;

  const dataIndexByDayKey = React.useMemo(() => {
    const map: Partial<Record<V2TemplateDayKey, number>> = {};
    data.forEach((card, index) => {
      const dayKey = v2_parseDayKey(card.day);
      if (!dayKey || map[dayKey] !== undefined) return;
      map[dayKey] = index;
    });
    return map;
  }, [data]);

  const gridLayout =
    (renderConfig.layout.grid as Record<string, string | number>) ?? {};
  const {
    columns,
    gridTemplateColumns: gridTemplateColumnsRaw,
    ...gridStyleRaw
  } = gridLayout;
  const layoutMode = timetable.layoutMode;
  const emptySlots = new Set(timetable.emptySlots ?? []);
  const gridStyle = v2_toRenderableLayoutStyle(gridStyleRaw);
  const baseLayoutStyle: React.CSSProperties = {
    ...gridStyle,
  };

  if (layoutMode === "free") {
    delete baseLayoutStyle.right;
    delete baseLayoutStyle.bottom;
    delete baseLayoutStyle.transform;
    delete baseLayoutStyle.transformOrigin;
    Object.assign(baseLayoutStyle, {
      position: "absolute",
      left: 0,
      top: 0,
      width: renderConfig.templateSize.width,
      height: renderConfig.templateSize.height,
    });
  } else {
    delete baseLayoutStyle.width;
    delete baseLayoutStyle.height;
  }
  delete (baseLayoutStyle as Record<string, unknown>).display;
  delete (baseLayoutStyle as Record<string, unknown>).gridTemplateColumns;

  const columnGap = gridStyle.columnGap;
  const rowGap = gridStyle.rowGap;
  const columnCount =
    typeof columns === "number" && Number.isFinite(columns)
      ? Math.max(1, Math.round(columns))
      : 3;
  const gridTemplateColumns =
    typeof gridTemplateColumnsRaw === "string"
      ? gridTemplateColumnsRaw
      : layoutMode === "grid3x3"
        ? `repeat(${columnCount}, max-content)`
        : `repeat(${columnCount}, minmax(0, 1fr))`;

  const componentOrder = timetable.componentOrder.filter(
    (componentId) => timetable.components[componentId] !== undefined
  );
  const firstComponent = timetable.components[componentOrder[0] ?? ""];
  if (!firstComponent) return null;

  const slotEntries = v2_TEMPLATE_DAY_KEYS.map((dayKey, index) => {
    const slot = timetable.slots[dayKey] ?? {
      dayKey,
      componentId: firstComponent.id,
    };
    const component = timetable.components[slot.componentId] ?? firstComponent;
    const dataIndex = dataIndexByDayKey[slot.dayKey] ?? index;
    const cardData = data[dataIndex];
    const weekDate = weekDates[dataIndex];
    if (!cardData || !weekDate) return null;
    const entryCount = Math.max(
      1,
      Array.isArray(cardData.entries) ? cardData.entries.length : 0
    );
    const hasOfflineMemo =
      typeof cardData.offlineMemo === "string" &&
      cardData.offlineMemo.trim().length > 0;
    const status = v2_resolveTimetableStatus({
      isOffline: Boolean(cardData.isOffline),
      entryCount,
      hasOfflineMemo,
      multiEnabled: timetable.statusOptions.multi,
      offlineMemoEnabled: timetable.statusOptions.offlineMemo,
    });
    const state = v2_getStateForStatus(component, status);
    const transform = v2_resolveSlotTransform(slot.transform);
    const sizeOverride = {
      ...(state.size ? state.size : {}),
      ...(typeof transform.width === "number" ? { width: transform.width } : {}),
      ...(typeof transform.height === "number" ? { height: transform.height } : {}),
    };

    return {
      dayKey,
      slot,
      component,
      dataIndex,
      cardData,
      weekDate,
      state,
      transform,
      sizeOverride,
    };
  });

  const renderSlotCell = (
    entry: NonNullable<(typeof slotEntries)[number]>
  ): React.ReactNode => {
    return (
      <V2TimeTableCell
        time={entry.cardData}
        dayKeyOverride={entry.slot.dayKey}
        cardInstanceId={entry.dayKey}
        cardInstanceLayerId={`${timetable.layerId}:${entry.dayKey}`}
        currentTheme={currentTheme}
        weekDate={entry.weekDate}
        index={entry.dataIndex}
        cardStructure={entry.state.card}
        cardContainerSizeOverride={entry.sizeOverride}
        disableNodeVisibilityFilter
      />
    );
  };

  const getWrapperStyle = (
    transform: V2TimetableSlotTransform
  ): React.CSSProperties => {
    const transformParts: string[] = [];
    if (transform.x !== 0 || transform.y !== 0) {
      transformParts.push(`translate(${transform.x}px, ${transform.y}px)`);
    }
    if (transform.rotateDeg !== 0) {
      transformParts.push(`rotate(${transform.rotateDeg}deg)`);
    }
    if (transform.scale !== 1) {
      transformParts.push(`scale(${transform.scale})`);
    }

    return {
      ...(transformParts.length > 0
        ? {
            transform: transformParts.join(" "),
            transformOrigin: "center center",
          }
        : {}),
      ...(transform.opacity !== 1 ? { opacity: transform.opacity } : {}),
    };
  };

  const getFreeWrapperStyle = (
    transform: V2TimetableSlotTransform
  ): React.CSSProperties => {
    const transformParts: string[] = [];
    if (transform.rotateDeg !== 0) {
      transformParts.push(`rotate(${transform.rotateDeg}deg)`);
    }
    if (transform.scale !== 1) {
      transformParts.push(`scale(${transform.scale})`);
    }

    return {
      position: "absolute",
      left: transform.x,
      top: transform.y,
      ...(transformParts.length > 0
        ? {
            transform: transformParts.join(" "),
            transformOrigin: "center center",
          }
        : {}),
      ...(transform.opacity !== 1 ? { opacity: transform.opacity } : {}),
    };
  };

  if (
    v2_isLayerHiddenByAliases({
      hiddenLayerIds,
      layerIds: ["grid", "scene-grid", gridLayerId, timetable.layerId],
    })
  ) {
    return null;
  }

  const highlightStyle = v2_getHighlightStyle({
    target: "grid",
    hoverTarget: hoverHighlightTarget,
    activeTarget: activeHighlightTarget,
  });

  if (layoutMode === "free") {
    return (
      <div style={{ ...baseLayoutStyle, ...highlightStyle }} className="absolute">
        {slotEntries.map((entry) => {
          if (!entry) return null;
          return (
            <div
              key={entry.dayKey}
              {...v2_getGridEditorAttributes({
                layerId: `${gridLayerId ?? timetable.layerId}:${entry.dayKey}`,
                dragKind: "timetableSlot",
                dayKey: entry.dayKey,
              })}
              style={getFreeWrapperStyle(entry.transform)}
            >
              {renderSlotCell(entry)}
            </div>
          );
        })}
      </div>
    );
  }

  if (layoutMode === "flex4x2") {
    const threeRowAlignClass =
      timetable.flex42Align === "left"
        ? "justify-start"
        : timetable.flex42Align === "right"
          ? "justify-end"
          : "justify-center";
    const isTopRowThree = timetable.flex42ThreeRow === "top";
    const topRowEntries = isTopRowThree
      ? slotEntries.slice(0, 3)
      : slotEntries.slice(0, 4);
    const bottomRowEntries = isTopRowThree
      ? slotEntries.slice(3, 7)
      : slotEntries.slice(4, 7);

    return (
      <div
        {...v2_getGridEditorAttributes({
          layerId: gridLayerId ?? timetable.layerId,
          dragKind: "grid",
        })}
        style={{
          ...baseLayoutStyle,
          display: "flex",
          flexDirection: "column",
          ...(rowGap !== undefined ? { rowGap } : {}),
          ...highlightStyle,
        }}
        className="absolute"
      >
        <div
          className={`flex ${isTopRowThree ? threeRowAlignClass : "justify-start"}`}
          style={{ columnGap }}
        >
          {topRowEntries.map((entry) =>
            entry ? (
              <div key={entry.dayKey} style={getWrapperStyle(entry.transform)}>
                {renderSlotCell(entry)}
              </div>
            ) : null
          )}
        </div>
        <div
          className={`flex ${isTopRowThree ? "justify-start" : threeRowAlignClass}`}
          style={{ columnGap }}
        >
          {bottomRowEntries.map((entry) =>
            entry ? (
              <div key={entry.dayKey} style={getWrapperStyle(entry.transform)}>
                {renderSlotCell(entry)}
              </div>
            ) : null
          )}
        </div>
      </div>
    );
  }

  const slotNodes: React.ReactNode[] = [];
  let itemIndex = 0;

  for (let slot = 1; slot <= 9; slot += 1) {
    if (emptySlots.has(slot)) {
      slotNodes.push(<div key={`timetable-grid-empty-${slot}`} />);
      continue;
    }

    const entry = slotEntries[itemIndex];
    if (!entry) {
      slotNodes.push(<div key={`timetable-grid-missing-${slot}`} />);
      itemIndex += 1;
      continue;
    }

    slotNodes.push(
      <div key={entry.dayKey} style={getWrapperStyle(entry.transform)}>
        {renderSlotCell(entry)}
      </div>
    );
    itemIndex += 1;
  }

  return (
    <div
      {...v2_getGridEditorAttributes({
        layerId: gridLayerId ?? timetable.layerId,
        dragKind: "grid",
      })}
      style={{
        ...baseLayoutStyle,
        display: "grid",
        gridTemplateColumns,
        ...highlightStyle,
      }}
      className="absolute grid"
    >
      {slotNodes}
    </div>
  );
};

export default V2TimetableGrid;
