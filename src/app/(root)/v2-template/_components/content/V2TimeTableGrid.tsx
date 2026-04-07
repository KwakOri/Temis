import React from "react";

import { useTimeTableData } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { V2TemplateComponentInstanceMode } from "@/types/time-table/v2_template_render_config";
import V2TimeTableCell from "./V2TimeTableCell";
import { v2_getHighlightStyle } from "./v2_highlight";
import { v2_toRenderableStyle } from "./v2_style";

type V2GridLayoutMode = "grid3x3" | "flex4x2";
type V2Flex42Align = "left" | "center" | "right";
type V2Flex42ThreeRow = "top" | "bottom";

const v2_parseCardInstanceMode = (
  value: unknown
): V2TemplateComponentInstanceMode => {
  return value === "detached" ? "detached" : "component";
};

const v2_getCardInstanceOffset = (
  transforms: Record<string, { offsetX?: number; offsetY?: number }> | undefined,
  index: number
): { x: number; y: number } => {
  const transform = transforms?.[String(index)];
  const x =
    typeof transform?.offsetX === "number" && Number.isFinite(transform.offsetX)
      ? transform.offsetX
      : 0;
  const y =
    typeof transform?.offsetY === "number" && Number.isFinite(transform.offsetY)
      ? transform.offsetY
      : 0;
  return { x, y };
};

const v2_parseGridLayoutMode = (value: unknown): V2GridLayoutMode => {
  return value === "flex4x2" ? "flex4x2" : "grid3x3";
};

const v2_parseFlex42Align = (value: unknown): V2Flex42Align => {
  if (value === "left" || value === "center" || value === "right") return value;
  return "center";
};

const v2_parseFlex42ThreeRow = (value: unknown): V2Flex42ThreeRow => {
  return value === "top" ? "top" : "bottom";
};

const v2_parseGridEmptySlots = (
  slotA: unknown,
  slotB: unknown
): Set<number> => {
  const parseSlot = (value: unknown): number | undefined => {
    const candidate =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number.parseInt(value, 10)
          : NaN;

    if (!Number.isFinite(candidate)) return undefined;
    const rounded = Math.round(candidate);
    if (rounded < 1 || rounded > 9) return undefined;
    return rounded;
  };

  const slots = [parseSlot(slotA), parseSlot(slotB)].filter(
    (slot): slot is number => slot !== undefined
  );
  const uniqueSlots = Array.from(new Set(slots)).slice(0, 2);

  return new Set(uniqueSlots);
};

const TimeTableGrid: React.FC = () => {
  const {
    data,
    currentTheme,
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
  } = useV2TimeTableEditorRuntimeContext();
  const { weekDates } = useTimeTableData();
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const gridLayout =
    (renderConfig.layout.grid as Record<string, string | number>) ?? {};
  const {
    columns,
    layoutMode: layoutModeRaw,
    gridEmptySlotA,
    gridEmptySlotB,
    flex42ThreeRow: flex42ThreeRowRaw,
    flex42Align: flex42AlignRaw,
    gridTemplateColumns: gridTemplateColumnsRaw,
    ...gridStyleRaw
  } = gridLayout;
  const layoutMode = v2_parseGridLayoutMode(layoutModeRaw);
  const flex42ThreeRow = v2_parseFlex42ThreeRow(flex42ThreeRowRaw);
  const flex42Align = v2_parseFlex42Align(flex42AlignRaw);
  const emptySlots = v2_parseGridEmptySlots(gridEmptySlotA, gridEmptySlotB);
  const gridStyle = v2_toRenderableStyle(gridStyleRaw);
  const baseLayoutStyle: React.CSSProperties = {
    ...gridStyle,
  };
  delete (baseLayoutStyle as Record<string, unknown>).display;
  delete (baseLayoutStyle as Record<string, unknown>).gridTemplateColumns;
  const columnGap = gridStyle.columnGap;
  const rowGap = gridStyle.rowGap;
  const gridTemplateColumns =
    typeof gridTemplateColumnsRaw === "string"
      ? gridTemplateColumnsRaw
      : typeof columns === "number" && Number.isFinite(columns)
        ? `repeat(${Math.max(1, Math.round(columns))}, minmax(0, 1fr))`
        : "repeat(3, minmax(0, 1fr))";
  const cardInstanceMode = v2_parseCardInstanceMode(
    renderConfig.structure.card.instanceMode
  );
  const cardInstanceTransforms = renderConfig.structure.card.instanceTransforms;

  const getCardInstanceWrapperStyle = (index: number): React.CSSProperties => {
    if (cardInstanceMode !== "detached") return {};
    const offset = v2_getCardInstanceOffset(cardInstanceTransforms, index);
    if (offset.x === 0 && offset.y === 0) return {};
    return {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    };
  };

  if (isLayerHidden("grid")) return null;

  if (layoutMode === "flex4x2") {
    const threeRowAlignClass =
      flex42Align === "left"
        ? "justify-start"
        : flex42Align === "right"
          ? "justify-end"
          : "justify-center";
    const isTopRowThree = flex42ThreeRow === "top";
    const topRowItems = isTopRowThree ? data.slice(0, 3) : data.slice(0, 4);
    const bottomRowItems = isTopRowThree ? data.slice(3, 7) : data.slice(4, 7);
    const bottomRowIndexOffset = isTopRowThree ? 3 : 4;

    return (
      <div
        style={{
          ...baseLayoutStyle,
          display: "flex",
          flexDirection: "column",
          ...(rowGap !== undefined ? { rowGap } : {}),
          ...v2_getHighlightStyle({
            target: "grid",
            hoverTarget: hoverHighlightTarget,
            activeTarget: activeHighlightTarget,
          }),
        }}
        className="absolute z-20"
      >
        <div
          className={`flex ${isTopRowThree ? threeRowAlignClass : "justify-start"}`}
          style={{ columnGap }}
        >
          {topRowItems.map((time, localIndex) => {
            const index = localIndex;
            return (
              <div
                key={`flex42-top-row-${time.day}`}
                style={getCardInstanceWrapperStyle(index)}
              >
                <V2TimeTableCell
                  time={time}
                  currentTheme={currentTheme}
                  weekDate={weekDates[index]}
                  index={index}
                />
              </div>
            );
          })}
        </div>
        <div
          className={`flex ${isTopRowThree ? "justify-start" : threeRowAlignClass}`}
          style={{ columnGap }}
        >
          {bottomRowItems.map((time, localIndex) => {
            const index = bottomRowIndexOffset + localIndex;
            return (
              <div
                key={`flex42-bottom-row-${time.day}`}
                style={getCardInstanceWrapperStyle(index)}
              >
                <V2TimeTableCell
                  time={time}
                  currentTheme={currentTheme}
                  weekDate={weekDates[index]}
                  index={index}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const slotNodes: React.ReactNode[] = [];
  let itemIndex = 0;

  for (let slot = 1; slot <= 9; slot += 1) {
    if (emptySlots.has(slot)) {
      slotNodes.push(<div key={`grid3x3-empty-${slot}`} />);
      continue;
    }

    const time = data[itemIndex];
    const weekDate = weekDates[itemIndex];

    if (!time || !weekDate) {
      slotNodes.push(<div key={`grid3x3-missing-${slot}`} />);
      continue;
    }

    slotNodes.push(
      <div
        key={`grid3x3-cell-${slot}`}
        style={getCardInstanceWrapperStyle(itemIndex)}
      >
        <V2TimeTableCell
          time={time}
          currentTheme={currentTheme}
          weekDate={weekDate}
          index={itemIndex}
        />
      </div>
    );
    itemIndex += 1;
  }

  return (
    <div
      style={{
        ...baseLayoutStyle,
        display: "grid",
        gridTemplateColumns,
        ...v2_getHighlightStyle({
          target: "grid",
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
      className="absolute grid z-20"
    >
      {slotNodes}
    </div>
  );
};

export default TimeTableGrid;
