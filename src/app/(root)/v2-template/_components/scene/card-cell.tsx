/* eslint-disable @next/next/no-img-element */
import React from "react";

import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRuntimeData } from "@/contexts/v2/template-runtime-ui-context";
import {
  useTemplateRenderConfigContext,
  resolveAssetUrlFromConfig,
} from "@/contexts/v2/template-render-config-context";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  V2TemplateCardNode,
  V2TemplateComponentInstanceBindingOverrides,
  V2TemplateCardStructure,
  V2TemplateDayKey,
  V2TemplateCardStyleKey,
  V2TemplateComputedBindingKey,
  V2TemplateCardFrameNode,
} from "@/types/time-table/template-render-config";
import {
  v2_dayKeyFromIndex,
  v2_getComponentFontFamily,
  v2_isEntryFieldBindingKey,
  v2_parseDayKey,
  v2_isVisibleByMode,
} from "@/utils/v2/template-render-config";
import {
  v2_buildCardInstanceHighlightTarget,
  v2_buildCardInstanceNodeHighlightTarget,
  v2_resolveCardStatusGroupKey,
} from "@/utils/v2/card-instance-highlight-target";
import { v2_getRenderableCardNodeOrder } from "@/utils/v2/card-runtime-node-order-v2";
import { v2_isLayerHiddenByAliases } from "@/utils/v2/layer-visibility";
import { v2_buildComputedValues } from "@/utils/v2/text-formatting";
import {
  V2FlexibleTextNodeRenderer,
  V2PlainTextNodeRenderer,
} from "./card-node-renderers";
import { v2_getHighlightStyle } from "./highlight-style";
import { v2_toRenderableLayoutStyle, v2_toRenderableStyle } from "./render-style";

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  dayKeyOverride?: V2TemplateDayKey;
  currentTheme: TTheme;
  cardStructure: V2TemplateCardStructure;
  bindingOverrides?: V2TemplateComponentInstanceBindingOverrides;
  cardContainerSizeOverride?: {
    width?: string | number;
    height?: string | number;
  };
  cardInstanceId?: string;
  cardInstanceLayerId?: string;
  disableNodeVisibilityFilter?: boolean;
  enableEditorObjectHandles?: boolean;
}

const v2_toCardStyleMap = (
  cardLayoutRecord: Record<string, unknown>,
  styleKey: V2TemplateCardStyleKey
): Record<string, string | number> => {
  const raw = cardLayoutRecord[styleKey];
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, string | number>;
};

const v2_resolveRenderableCardLayout = (
  styleMap: Record<string, string | number>
): { style: React.CSSProperties; width?: string | number } => {
  const style = v2_toRenderableLayoutStyle(styleMap);
  const hasExplicitPosition = Object.prototype.hasOwnProperty.call(
    styleMap,
    "position"
  );
  const normalizedStyle =
    !hasExplicitPosition && style.position === "relative"
      ? {
          ...style,
          position: "absolute" as const,
        }
      : style;
  const width = normalizedStyle.width;

  return {
    style: normalizedStyle,
    ...(width !== undefined ? { width } : {}),
  };
};

const v2_getDefaultMaxFontSizeByBinding = ({
  binding,
  mainTitleMax,
  subTitleMax,
}: {
  binding: V2TemplateCardNode["binding"];
  mainTitleMax: number;
  subTitleMax: number;
}): number => {
  if (v2_isEntryFieldBindingKey(binding, "mainTitle")) return mainTitleMax;
  if (v2_isEntryFieldBindingKey(binding, "subTitle")) return subTitleMax;
  return mainTitleMax;
};

const v2_toTextValue = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
};

const v2_resolveEntryFromBinding = ({
  binding,
  entries,
}: {
  binding: V2TemplateCardNode["binding"];
  entries: Array<Record<string, unknown>>;
}): Record<string, unknown> => {
  let preferredIndex: number | null = null;
  if (binding.mode === "field" && binding.scope === "entry" && binding.entrySelector?.mode === "index") {
    preferredIndex = binding.entrySelector.index;
  } else if (binding.mode === "computed" && binding.entrySelector?.mode === "index") {
    preferredIndex = binding.entrySelector.index;
  }
  if (preferredIndex === null) return entries[0] ?? {};
  if (!Number.isFinite(preferredIndex)) {
    return entries[0] ?? {};
  }
  const safeIndex = Math.max(0, Math.floor(preferredIndex));
  return entries[safeIndex] ?? entries[0] ?? {};
};

const v2_applyInheritedEntryIndex = (
  binding: V2TemplateCardNode["binding"],
  inheritedEntryIndex?: number
): V2TemplateCardNode["binding"] => {
  if (typeof inheritedEntryIndex !== "number") return binding;
  if (!Number.isFinite(inheritedEntryIndex)) return binding;
  const entrySelector = {
    mode: "index" as const,
    index: Math.max(0, Math.floor(inheritedEntryIndex)),
  };
  if (binding.mode === "computed" && binding.entrySelector === undefined) {
    return {
      ...binding,
      entrySelector,
    };
  }
  if (
    binding.mode === "field" &&
    binding.scope === "entry" &&
    binding.entrySelector === undefined
  ) {
    return {
      ...binding,
      entrySelector,
    };
  }
  return binding;
};

const v2_getCardNodeTextValue = ({
  node,
  computedValues,
  selectedEntry,
  cardData,
  placeholdersByScope,
  globalData,
}: {
  node: V2TemplateCardNode;
  computedValues: Partial<Record<V2TemplateComputedBindingKey, string>>;
  selectedEntry: Record<string, unknown>;
  cardData: Record<string, unknown>;
  placeholdersByScope: Record<string, Record<string, string>>;
  globalData: Record<string, unknown>;
}): string => {
  if (node.binding.mode === "literal") {
    return node.binding.value;
  }

  if (node.binding.mode === "computed") {
    return computedValues[node.binding.key] ?? "";
  }

  if (node.binding.key === "mainTitle") {
    const entryMainTitle = v2_toTextValue(selectedEntry.mainTitle) ?? "";
    const knownMainTitle =
      entryMainTitle ||
      placeholdersByScope.entry.mainTitle ||
      placeholdersByScope.card.mainTitle ||
      placeholdersByScope.global.mainTitle;
    if (knownMainTitle) return knownMainTitle;
  }

  if (node.binding.key === "subTitle") {
    const entrySubTitle = v2_toTextValue(selectedEntry.subTitle) ?? "";
    const knownSubTitle =
      entrySubTitle ||
      placeholdersByScope.entry.subTitle ||
      placeholdersByScope.card.subTitle ||
      placeholdersByScope.global.subTitle;
    if (knownSubTitle) return knownSubTitle;
  }

  const source =
    node.binding.scope === "entry"
      ? selectedEntry
      : node.binding.scope === "card"
        ? cardData
        : node.binding.scope === "global"
          ? globalData
        : undefined;
  const rawValue = source?.[node.binding.key];
  const value = v2_toTextValue(rawValue);
  if (value !== null) return value;

  const scopedPlaceholder = placeholdersByScope[node.binding.scope]?.[node.binding.key];
  if (typeof scopedPlaceholder === "string") return scopedPlaceholder;

  const entryFallbackPlaceholder = placeholdersByScope.entry[node.binding.key];
  if (typeof entryFallbackPlaceholder === "string") return entryFallbackPlaceholder;

  return "";
};

const v2_resolveCardImageAssetRef = ({
  node,
  dayKey,
}: {
  node: V2TemplateCardNode;
  dayKey: V2TemplateDayKey;
}) => {
  if (node.kind !== "image") return undefined;
  return node.assetRefByDayKey?.[dayKey] ?? node.assetRef;
};

interface V2ResolvedRenderableCardNode {
  node: V2TemplateCardNode;
  element: React.ReactNode;
  entryStyleKey: string | null;
}

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  dayKeyOverride,
  index,
  currentTheme,
  cardStructure,
  bindingOverrides,
  cardContainerSizeOverride,
  cardInstanceId,
  cardInstanceLayerId,
  disableNodeVisibilityFilter = false,
  enableEditorObjectHandles = false,
}) => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const { weekDates } = useTemplateRuntimeData();
  const {
    hoverHighlightTarget,
    activeHighlightTarget,
    hiddenLayerIds,
    globalData,
  } = useTemplateRuntimeContext();
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const cardIsOffline = Boolean(time.isOffline);
  const cardSize = cardIsOffline
    ? renderConfig.cardSizes.offline
    : renderConfig.cardSizes.online;
  const cardContainerStyleMap = v2_toCardStyleMap(
    cardLayoutRecord,
    cardStructure.containerStyleKey
  );
  // Card root must stay in normal grid/flex flow unless position is explicitly set.
  // Auto-injecting absolute from offset props makes all cards overlap at one point.
  const cardContainerLayout = v2_toRenderableStyle(cardContainerStyleMap);
  const cardContainerStyle: React.CSSProperties = {
    ...cardSize,
    ...cardContainerLayout,
    ...cardContainerSizeOverride,
    ...v2_getHighlightStyle({
      target:
        typeof cardInstanceId === "string" && cardInstanceId.trim().length > 0
          ? v2_buildCardInstanceHighlightTarget(cardInstanceId)
          : cardStructure.containerHighlightTarget,
      hoverTarget: hoverHighlightTarget,
      activeTarget: activeHighlightTarget,
    }),
  };
  if (cardContainerStyle.position === undefined) {
    cardContainerStyle.position = "relative";
  }
  if (cardContainerStyle.overflow === undefined) {
    cardContainerStyle.overflow = "hidden";
  }
  const isHiddenByAliases = React.useCallback(
    (...layerIds: Array<string | null | undefined>) =>
      v2_isLayerHiddenByAliases({
        hiddenLayerIds,
        layerIds,
      }),
    [hiddenLayerIds]
  );
  const getEditorObjectAttributes = (
    layerId: string | undefined,
    highlightTarget: string | undefined
  ): React.HTMLAttributes<HTMLElement> | undefined => {
    if (!enableEditorObjectHandles || !layerId || !highlightTarget) {
      return undefined;
    }
    return {
      "data-v2-editor-layer-id": layerId,
      "data-v2-editor-highlight-target": highlightTarget,
      "data-v2-editor-drag-kind": "cardObject",
    } as React.HTMLAttributes<HTMLElement>;
  };
  const dayKey =
    dayKeyOverride ?? v2_parseDayKey(time.day) ?? v2_dayKeyFromIndex(index);
  const placeholdersByScope = renderConfig.formSchema.fields.reduce(
    (
      acc: Record<string, Record<string, string>>,
      field
    ): Record<string, Record<string, string>> => {
      if (!acc[field.scope]) {
        acc[field.scope] = {};
      }
      acc[field.scope][field.key] = field.placeholder;
      return acc;
    },
    {
      entry: {},
      card: {},
      global: {},
    } as Record<string, Record<string, string>>
  );

  if (!weekDate) return "Loading";
  if (isHiddenByAliases(cardStructure.containerLayerId, cardInstanceLayerId)) return null;

  const primaryEntry = time.entries?.[0] || {};
  const entryCount = Math.max(
    1,
    Array.isArray(time.entries) ? time.entries.length : 0
  );
  const hasOfflineMemo =
    typeof time.offlineMemo === "string" && time.offlineMemo.trim().length > 0;
  const entryTime = (primaryEntry.time as string) || "09:00";
  const computedValues = v2_buildComputedValues({
    dayKey,
    weekDate,
    weekDates,
    entryTime,
    isGuerrilla: Boolean(primaryEntry.isGuerrilla),
    renderConfig,
  });

  const resolveRenderableCardNode = (
    nodeId: string,
    inheritedEntryIndex?: number
  ): V2ResolvedRenderableCardNode | null => {
    const node = cardStructure.nodes[nodeId];
    if (!node) return null;
    const nodeLayerId =
      typeof node.layerId === "string" && node.layerId.trim().length > 0
        ? node.layerId
        : node.id;
    const nodeStatusGroup = v2_resolveCardStatusGroupKey(node.visibilityMode);
    if (
      isHiddenByAliases(
        node.layerId,
        nodeLayerId,
        cardInstanceLayerId
          ? `${cardInstanceLayerId}::status:${nodeStatusGroup}`
          : undefined,
        node.entryStyleKey && cardInstanceLayerId
          ? `${cardInstanceLayerId}::status:${nodeStatusGroup}::entry:${node.entryStyleKey}`
          : undefined,
        cardInstanceLayerId
          ? `${cardInstanceLayerId}::status:${nodeStatusGroup}::${nodeLayerId}`
          : undefined
      )
    ) {
      return null;
    }
    if (
      !disableNodeVisibilityFilter &&
      !v2_isVisibleByMode({
        mode: node.visibilityMode,
        isOffline: cardIsOffline,
        entryCount,
        hasOfflineMemo,
      })
    ) {
      return null;
    }

    const containerStyleMap = v2_toCardStyleMap(
      cardLayoutRecord,
      node.containerStyleKey
    );
    const { style: renderableContainerStyle, width } =
      v2_resolveRenderableCardLayout(containerStyleMap);
    const nodeHighlightTarget =
      typeof cardInstanceId === "string" && cardInstanceId.trim().length > 0
        ? v2_buildCardInstanceNodeHighlightTarget({
            instanceId: cardInstanceId,
            statusGroupKey: nodeStatusGroup,
            nodeLayerId,
          })
        : node.highlightTarget;
    const highlightStyle = v2_getHighlightStyle({
      target: nodeHighlightTarget,
      hoverTarget: hoverHighlightTarget,
      activeTarget: activeHighlightTarget,
    });

    if (node.kind === "image") {
      const dayAssetRef = node.assetRefByDayKey?.[dayKey];
      const assetRef = v2_resolveCardImageAssetRef({ node, dayKey });
      const theme = currentTheme || renderConfig.defaultTheme;
      const imageUrl =
        resolveAssetUrlFromConfig({
          renderConfig,
          assetRef,
          currentTheme: theme,
        }) ??
        (dayAssetRef && node.assetRef
          ? resolveAssetUrlFromConfig({
              renderConfig,
              assetRef: node.assetRef,
              currentTheme: theme,
            })
          : null);
      if (!imageUrl) return null;
      const isBackgroundNode = node.id.toLowerCase().includes("background");
      const imageContainerStyle: React.CSSProperties = {
        ...renderableContainerStyle,
        ...highlightStyle,
      };
      if (isBackgroundNode) {
        imageContainerStyle.left = 0;
        imageContainerStyle.top = 0;
        imageContainerStyle.width =
          cardContainerSizeOverride?.width ??
          imageContainerStyle.width ??
          "100%";
        imageContainerStyle.height =
          cardContainerSizeOverride?.height ??
          imageContainerStyle.height ??
          "100%";
      }

      return {
        node,
        entryStyleKey: null,
        element: (
          <div
            key={node.id}
            {...getEditorObjectAttributes(node.layerId, nodeHighlightTarget)}
            style={imageContainerStyle}
            className={node.containerClassName ?? "absolute"}
          >
            <img
              src={imageUrl}
              alt={node.alt ?? node.label}
              className="h-full w-full"
              style={{ objectFit: node.fit ?? "cover" }}
            />
          </div>
        ),
      };
    }

    const textStyleMap = node.textStyleKey
      ? v2_toCardStyleMap(cardLayoutRecord, node.textStyleKey)
      : {};
    const textStyle = v2_toRenderableStyle(textStyleMap);
    const effectiveBinding = v2_applyInheritedEntryIndex(
      bindingOverrides?.[node.id] ?? node.binding,
      inheritedEntryIndex
    );
    const selectedEntry = v2_resolveEntryFromBinding({
      binding: effectiveBinding,
      entries: (time.entries ?? []) as Array<Record<string, unknown>>,
    });
    const nodeComputedValues =
      effectiveBinding.mode === "computed"
        ? v2_buildComputedValues({
            dayKey,
            weekDate,
            weekDates,
            entryTime: (selectedEntry.time as string) || entryTime,
            isGuerrilla: Boolean(selectedEntry.isGuerrilla),
            renderConfig,
          })
        : computedValues;
    const nodeText = v2_getCardNodeTextValue({
      node: {
        ...node,
        binding: effectiveBinding,
      },
      computedValues: nodeComputedValues,
      selectedEntry,
      cardData: time as Record<string, unknown>,
      placeholdersByScope,
      globalData: globalData as Record<string, unknown>,
    });
    const fontFamily = v2_getComponentFontFamily(renderConfig, node.fontKey);
    const color = renderConfig.componentColors[node.colorKey];

    const renderAutoResizeNode = () => {
      const nodeOptions = node.optionsKey
        ? ((cardLayoutRecord[node.optionsKey] as Record<string, unknown>) ?? {})
        : {};
      const maxFontSize = v2_getDefaultMaxFontSizeByBinding({
        binding: effectiveBinding,
        mainTitleMax: renderConfig.maxFontSizes.MAIN_TITLE,
        subTitleMax: renderConfig.maxFontSizes.SUB_TITLE,
      });
      const multiline =
        typeof nodeOptions.multiline === "boolean" ? nodeOptions.multiline : true;

      return (
        <V2FlexibleTextNodeRenderer
          key={node.id}
          nodeId={node.id}
          text={nodeText}
          containerStyle={renderableContainerStyle}
          width={width}
          textStyle={textStyle}
          highlightStyle={highlightStyle}
          containerClassName={node.containerClassName}
          textClassName={node.textClassName}
          editorAttributes={getEditorObjectAttributes(
            node.layerId,
            nodeHighlightTarget
          )}
          fontFamily={fontFamily}
          color={color}
          multiline={multiline}
          maxFontSize={maxFontSize}
        />
      );
    };

    if (node.kind === "flexibleText") {
      return {
        node,
        entryStyleKey: node.entryStyleKey ?? null,
        element: renderAutoResizeNode(),
      };
    }

    return {
      node,
      entryStyleKey: node.entryStyleKey ?? null,
      element: (
        <V2PlainTextNodeRenderer
          key={node.id}
          nodeId={node.id}
          text={nodeText}
          containerStyle={renderableContainerStyle}
          width={width}
          textStyle={textStyle}
          highlightStyle={highlightStyle}
          containerClassName={node.containerClassName}
          editorAttributes={getEditorObjectAttributes(
            node.layerId,
            nodeHighlightTarget
          )}
          fontFamily={fontFamily}
          color={color}
        />
      ),
    };
  };

  const renderFrameObject = ({
    frame,
    inheritedEntryIndex,
    visiting,
  }: {
    frame: V2TemplateCardFrameNode;
    inheritedEntryIndex?: number;
    visiting: Set<string>;
  }): React.ReactNode => {
    if (visiting.has(frame.id)) return null;
    if (
      isHiddenByAliases(
        frame.layerId,
        cardInstanceLayerId
          ? `${cardInstanceLayerId}::${frame.layerId}`
          : undefined
      )
    ) {
      return null;
    }
    if (
      !disableNodeVisibilityFilter &&
      !v2_isVisibleByMode({
        mode: frame.visibilityMode,
        isOffline: cardIsOffline,
        entryCount,
        hasOfflineMemo,
      })
    ) {
      return null;
    }

    const frameStyle = v2_resolveRenderableCardLayout(
      v2_toCardStyleMap(cardLayoutRecord, frame.styleKey)
    ).style;
    const frameEntryIndex =
      frame.bindingContext?.scope === "entry"
        ? frame.bindingContext.entryIndex
        : inheritedEntryIndex;
    const nextVisiting = new Set(visiting);
    nextVisiting.add(frame.id);

    return (
      <div
        key={frame.id}
        {...getEditorObjectAttributes(frame.layerId, frame.highlightTarget)}
        style={{
          ...frameStyle,
          ...v2_getHighlightStyle({
            target: frame.highlightTarget,
            hoverTarget: hoverHighlightTarget,
            activeTarget: activeHighlightTarget,
          }),
        }}
        className={frame.containerClassName ?? "absolute"}
      >
        {frame.childIds.map((childId) =>
          renderCardObject({
            objectId: childId,
            inheritedEntryIndex: frameEntryIndex,
            visiting: nextVisiting,
          })
        )}
      </div>
    );
  };

  const renderCardObject = ({
    objectId,
    inheritedEntryIndex,
    visiting,
  }: {
    objectId: string;
    inheritedEntryIndex?: number;
    visiting: Set<string>;
  }): React.ReactNode => {
    const frame = cardStructure.frameNodes?.[objectId];
    if (frame) {
      return renderFrameObject({
        frame,
        inheritedEntryIndex,
        visiting,
      });
    }

    const resolved = resolveRenderableCardNode(objectId, inheritedEntryIndex);
    if (!resolved) return null;
    if (!resolved.entryStyleKey) return resolved.element;

    return (
      <div
        key={`card-entry:${resolved.entryStyleKey}:${resolved.node.id}`}
        style={
          v2_resolveRenderableCardLayout(
            v2_toCardStyleMap(cardLayoutRecord, resolved.entryStyleKey)
          ).style
        }
      >
        {resolved.element}
      </div>
    );
  };

  const rootObjectIds = cardStructure.rootObjectIds?.length
    ? cardStructure.rootObjectIds
    : null;
  if (rootObjectIds) {
    return (
      <div
        style={cardContainerStyle}
        key={time.day}
        className="relative flex justify-center"
      >
        {rootObjectIds.map((objectId) =>
          renderCardObject({
            objectId,
            visiting: new Set(),
          })
        )}
      </div>
    );
  }

  const renderableNodeOrder = v2_getRenderableCardNodeOrder(cardStructure);
  const resolvedRenderableNodes = renderableNodeOrder
    .map((nodeId) => resolveRenderableCardNode(nodeId))
    .filter((entry): entry is V2ResolvedRenderableCardNode => Boolean(entry));
  const entryBuckets = new Map<
    string,
    { style: React.CSSProperties; children: React.ReactNode[] }
  >();
  const rootRenderItems: Array<
    | { kind: "node"; key: string; element: React.ReactNode }
    | { kind: "entry"; key: string }
  > = [];

  resolvedRenderableNodes.forEach(({ node, element, entryStyleKey }) => {
    if (entryStyleKey) {
      let bucket = entryBuckets.get(entryStyleKey);
      if (!bucket) {
        bucket = {
          style: v2_resolveRenderableCardLayout(
            v2_toCardStyleMap(cardLayoutRecord, entryStyleKey)
          ).style,
          children: [],
        };
        entryBuckets.set(entryStyleKey, bucket);
        rootRenderItems.push({
          kind: "entry",
          key: entryStyleKey,
        });
      }
      bucket.children.push(element);
      return;
    }

    rootRenderItems.push({
      kind: "node",
      key: node.id,
      element,
    });
  });

  return (
    <div
      style={cardContainerStyle}
      key={time.day}
      className="relative flex justify-center"
    >
      {rootRenderItems.map((item) => {
        if (item.kind === "node") return item.element;
        const bucket = entryBuckets.get(item.key);
        if (!bucket || bucket.children.length === 0) return null;
        return (
          <div key={`card-entry:${item.key}`} style={bucket.style}>
            {bucket.children}
          </div>
        );
      })}
    </div>
  );
};

export default TimeTableCell;
