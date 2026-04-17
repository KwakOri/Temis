import React from "react";

import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRuntimeData } from "@/contexts/v2/template-runtime-ui-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  V2TemplateCardStructure,
  V2TemplateComponentInstanceMode,
  V2TemplateDayKey,
  V2TemplateSceneComponentInstanceNode,
} from "@/types/time-table/template-render-config";
import {
  v2_parseDayKey,
} from "@/utils/v2/template-render-config";
import V2TimeTableCell from "./card-cell";
import { v2_getHighlightStyle } from "./highlight-style";
import { v2_toRenderableLayoutStyle } from "./render-style";

type V2GridLayoutMode = "grid3x3" | "flex4x2" | "free";
type V2Flex42Align = "left" | "center" | "right";
type V2Flex42ThreeRow = "top" | "bottom";

const v2_parseCardInstanceMode = (
  value: unknown
): V2TemplateComponentInstanceMode => {
  return value === "detached" ? "detached" : "component";
};

const v2_getCardInstanceTransform = (
  transforms:
    | Record<
        string,
        {
          offsetX?: number;
          offsetY?: number;
          width?: number;
          height?: number;
          rotateDeg?: number;
          scale?: number;
          opacity?: number;
        }
      >
    | undefined,
  index: number,
  instanceKey?: string
): {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotateDeg: number;
  scale: number;
  opacity: number;
} => {
  const transform =
    (typeof instanceKey === "string" ? transforms?.[instanceKey] : undefined) ??
    transforms?.[String(index)];
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

const v2_parseGridLayoutMode = (value: unknown): V2GridLayoutMode => {
  if (value === "flex4x2") return "flex4x2";
  if (value === "free") return "free";
  return "grid3x3";
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

const TimeTableGrid: React.FC<{
  cardStructure: V2TemplateCardStructure;
  cardStructureByComponentId?: Record<string, V2TemplateCardStructure>;
  instances?: V2TemplateSceneComponentInstanceNode[];
}> = ({ cardStructure, cardStructureByComponentId, instances }) => {
  const {
    data,
    currentTheme,
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
  } = useTemplateRuntimeContext();
  const { weekDates } = useTemplateRuntimeData();
  const { renderConfig } = useTemplateRenderConfigContext();
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
  const gridStyle = v2_toRenderableLayoutStyle(gridStyleRaw);
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
  const dataIndexByDayKey = React.useMemo(() => {
    const map: Partial<Record<V2TemplateDayKey, number>> = {};
    data.forEach((card, index) => {
      const dayKey = v2_parseDayKey(card.day);
      if (!dayKey) return;
      if (map[dayKey] !== undefined) return;
      map[dayKey] = index;
    });
    return map;
  }, [data]);
  const runtimeInstances = Array.isArray(instances) ? instances : [];
  const resolveCardStructureForInstance = (
    instance: V2TemplateSceneComponentInstanceNode
  ): V2TemplateCardStructure => {
    const structureByInstanceComponentId = cardStructureByComponentId?.[
      instance.componentId
    ];
    return structureByInstanceComponentId ?? cardStructure;
  };

  const getCardInstanceWrapperStyle = (
    instanceId: string,
    fallbackIndex: number,
    instanceCardStructure: V2TemplateCardStructure
  ): React.CSSProperties => {
    const cardInstanceMode = v2_parseCardInstanceMode(
      instanceCardStructure.instanceMode
    );
    if (cardInstanceMode !== "detached") return {};
    const cardInstanceTransforms = instanceCardStructure.instanceTransforms;
    const transform =
      v2_getCardInstanceTransform(cardInstanceTransforms, fallbackIndex, instanceId);

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

    const style: React.CSSProperties = {};
    if (transformParts.length > 0) {
      style.transform = transformParts.join(" ");
      style.transformOrigin = "center center";
    }
    if (transform.opacity !== 1) {
      style.opacity = transform.opacity;
    }
    return style;
  };
  const getCardInstanceFreeStyle = (
    instance: V2TemplateSceneComponentInstanceNode,
    fallbackIndex: number,
    instanceCardStructure: V2TemplateCardStructure
  ): React.CSSProperties => {
    const transform = v2_getCardInstanceTransform(
      instanceCardStructure.instanceTransforms,
      fallbackIndex,
      instance.instanceId
    );
    const transformParts: string[] = [];
    if (transform.rotateDeg !== 0) {
      transformParts.push(`rotate(${transform.rotateDeg}deg)`);
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
  const getCardInstanceSizeOverride = (
    instance: V2TemplateSceneComponentInstanceNode,
    fallbackIndex: number,
    instanceCardStructure: V2TemplateCardStructure
  ): { width?: number; height?: number } => {
    const transform = v2_getCardInstanceTransform(
      instanceCardStructure.instanceTransforms,
      fallbackIndex,
      instance.instanceId
    );
    return {
      ...(typeof transform.width === "number" ? { width: transform.width } : {}),
      ...(typeof transform.height === "number" ? { height: transform.height } : {}),
    };
  };
  const resolveDataIndex = (
    instance: V2TemplateSceneComponentInstanceNode,
    fallbackIndex: number
  ) => {
    if (dataIndexByDayKey[instance.dayKey] !== undefined) {
      return dataIndexByDayKey[instance.dayKey] as number;
    }
    const parsedIndex = Number.parseInt(instance.instanceId, 10);
    if (
      Number.isFinite(parsedIndex) &&
      parsedIndex >= 0 &&
      parsedIndex < data.length
    ) {
      return parsedIndex;
    }
    return fallbackIndex;
  };
  const isCardInstanceHidden = (instance: V2TemplateSceneComponentInstanceNode) => {
    const instanceLayerId =
      typeof instance.layerId === "string" && instance.layerId.trim().length > 0
        ? instance.layerId
        : instance.id;
    return isLayerHidden(instanceLayerId);
  };

  if (isLayerHidden("grid")) return null;

  if (layoutMode === "free") {
    return (
      <div
        style={{
          ...baseLayoutStyle,
          ...v2_getHighlightStyle({
            target: "grid",
            hoverTarget: hoverHighlightTarget,
            activeTarget: activeHighlightTarget,
          }),
        }}
        className="absolute"
      >
        {runtimeInstances.map((instance, index) => {
          if (isCardInstanceHidden(instance)) return null;
          const dataIndex = resolveDataIndex(instance, index);
          const time = data[dataIndex];
          const weekDate = weekDates[dataIndex];
          const instanceCardStructure = resolveCardStructureForInstance(instance);
          if (!time || !weekDate) return null;
          return (
            <div
              key={instance.id}
              style={getCardInstanceFreeStyle(
                instance,
                dataIndex,
                instanceCardStructure
              )}
            >
              <V2TimeTableCell
                time={time}
                dayKeyOverride={instance.dayKey}
                currentTheme={currentTheme}
                weekDate={weekDate}
                index={dataIndex}
                cardStructure={instanceCardStructure}
                bindingOverrides={instance.bindingOverrides}
                cardContainerSizeOverride={getCardInstanceSizeOverride(
                  instance,
                  dataIndex,
                  instanceCardStructure
                )}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (layoutMode === "flex4x2") {
    const threeRowAlignClass =
      flex42Align === "left"
        ? "justify-start"
        : flex42Align === "right"
          ? "justify-end"
          : "justify-center";
    const isTopRowThree = flex42ThreeRow === "top";
    const topRowInstances = isTopRowThree
      ? runtimeInstances.slice(0, 3)
      : runtimeInstances.slice(0, 4);
    const bottomRowInstances = isTopRowThree
      ? runtimeInstances.slice(3, 7)
      : runtimeInstances.slice(4, 7);
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
        className="absolute"
      >
        <div
          className={`flex ${isTopRowThree ? threeRowAlignClass : "justify-start"}`}
          style={{ columnGap }}
        >
          {topRowInstances.map((instance, localIndex) => {
            if (isCardInstanceHidden(instance)) return null;
            const index = localIndex;
            const dataIndex = resolveDataIndex(instance, index);
            const time = data[dataIndex];
            const weekDate = weekDates[dataIndex];
            const instanceCardStructure = resolveCardStructureForInstance(instance);
            if (!time || !weekDate) return null;
            return (
              <div
                key={instance.id}
                style={getCardInstanceWrapperStyle(
                  instance.instanceId,
                  dataIndex,
                  instanceCardStructure
                )}
              >
                <V2TimeTableCell
                  time={time}
                  dayKeyOverride={instance.dayKey}
                  currentTheme={currentTheme}
                  weekDate={weekDate}
                  index={dataIndex}
                  cardStructure={instanceCardStructure}
                  bindingOverrides={instance.bindingOverrides}
                />
              </div>
            );
          })}
        </div>
        <div
          className={`flex ${isTopRowThree ? "justify-start" : threeRowAlignClass}`}
          style={{ columnGap }}
        >
          {bottomRowInstances.map((instance, localIndex) => {
            if (isCardInstanceHidden(instance)) return null;
            const index = bottomRowIndexOffset + localIndex;
            const dataIndex = resolveDataIndex(instance, index);
            const time = data[dataIndex];
            const weekDate = weekDates[dataIndex];
            const instanceCardStructure = resolveCardStructureForInstance(instance);
            if (!time || !weekDate) return null;
            return (
              <div
                key={instance.id}
                style={getCardInstanceWrapperStyle(
                  instance.instanceId,
                  dataIndex,
                  instanceCardStructure
                )}
              >
                <V2TimeTableCell
                  time={time}
                  dayKeyOverride={instance.dayKey}
                  currentTheme={currentTheme}
                  weekDate={weekDate}
                  index={dataIndex}
                  cardStructure={instanceCardStructure}
                  bindingOverrides={instance.bindingOverrides}
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

    const instance = runtimeInstances[itemIndex];
    if (!instance) {
      slotNodes.push(<div key={`grid3x3-missing-${slot}`} />);
      continue;
    }
    if (isCardInstanceHidden(instance)) {
      slotNodes.push(<div key={`grid3x3-hidden-${slot}`} />);
      itemIndex += 1;
      continue;
    }

    const parsedIndex = Number.parseInt(instance.instanceId, 10);
    const dayKeyIndex = dataIndexByDayKey[instance.dayKey];
    const dataIndex =
      dayKeyIndex !== undefined
        ? dayKeyIndex
        : Number.isFinite(parsedIndex) && parsedIndex >= 0 && parsedIndex < data.length
          ? parsedIndex
          : itemIndex;
    const time = data[dataIndex];
    const weekDate = weekDates[dataIndex];
    const instanceCardStructure = resolveCardStructureForInstance(instance);

    if (!time || !weekDate) {
      slotNodes.push(<div key={`grid3x3-missing-${slot}`} />);
      continue;
    }

    slotNodes.push(
      <div
        key={instance.id}
        style={getCardInstanceWrapperStyle(
          instance.instanceId,
          dataIndex,
          instanceCardStructure
        )}
      >
        <V2TimeTableCell
          time={time}
          dayKeyOverride={instance.dayKey}
          currentTheme={currentTheme}
          weekDate={weekDate}
          index={dataIndex}
          cardStructure={instanceCardStructure}
          bindingOverrides={instance.bindingOverrides}
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
      className="absolute grid"
    >
      {slotNodes}
    </div>
  );
};

export default TimeTableGrid;
