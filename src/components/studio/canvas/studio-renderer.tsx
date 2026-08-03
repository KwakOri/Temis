"use client";

import React from "react";

import { cn } from "@/lib/utils";
import {
  StudioAsset,
  StudioAssetSlot,
  StudioGraphNode,
  StudioImageFit,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  resolveStudioAsset,
  resolveStudioTextBinding,
} from "@/utils/template-studio/binding-resolver";
import { getStudioNodeBackgroundAssetSlot } from "@/utils/template-studio/graph-nodes";
import { resolveStudioTextAppearance } from "@/utils/template-studio/text-appearance";
import {
  getStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import { getStudioPaintOrder } from "@/utils/template-studio/layer-order";
import { getStudioObjectRenderStyle } from "@/utils/template-studio/object-layout";
import { getStudioNodeRuntimeContext } from "@/utils/template-studio/entry-groups";
import {
  formatStudioImageObjectPosition,
  getStudioImageBorderRadius,
  getStudioImageObjectPosition,
} from "@/utils/thumbnail-studio/image-object-position";
import {
  getStudioShapeFillRenderStyle,
  resolveStudioShapeFill,
} from "@/utils/thumbnail-studio/shape-fill";
import { StudioWebFontLoader } from "@/components/studio/canvas/studio-web-font-loader";
import { StudioText } from "@/components/studio/text/studio-text";

interface StudioRendererProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  rootNodeIds?: string[];
  runtimeContext?: StudioRuntimeContext;
  selectedNodeId?: string | null;
  selectedNodeIds?: string[];
  /**
   * 노드 배경으로 그릴 그림 자리를 도메인 규칙으로 정한다.
   *
   * 기본값은 노드에 붙은 배경 자리를 그대로 쓴다. 시간표의 상태 카드 배경처럼
   * 상태에 따라 자리를 더 따져야 하는 도메인만 이 함수를 넘긴다. 그 판단을 공통
   * 렌더러가 갖고 있으면 썸네일 문서를 그릴 때도 시간표 개념을 통과한다.
   */
  resolveNodeBackgroundAssetSlot?: (
    node: StudioGraphNode,
    context: StudioRuntimeContext | undefined,
  ) => StudioAssetSlot | null;
  onSelectNode?: (
    nodeId: string,
    event?: React.MouseEvent<HTMLDivElement>,
  ) => void;
  /** Runtime-only image controls. The document itself remains immutable. */
  runtimeImageOverrides?: Record<
    string,
    { fit?: StudioImageFit; objectPosition?: string }
  >;
  backgroundOverride?: string | null;
  onFontLoadStateChange?: (
    state: import("./studio-web-font-loader").StudioWebFontLoadState,
  ) => void;
}

const toCssStyle = (styleRecord?: StudioStyleRecord): React.CSSProperties => {
  if (!styleRecord) return { position: "absolute" };

  const { rotateDeg, textWrapMode, ...rest } = styleRecord;
  // textWrapMode는 Auto Text 렌더 옵션이므로 CSS 선언으로 흘리지 않는다.
  void textWrapMode;
  const style = { ...rest } as React.CSSProperties;

  if (!style.position) {
    style.position = "absolute";
  }

  if (typeof rotateDeg === "number" && rotateDeg !== 0) {
    style.transform = [style.transform, `rotate(${rotateDeg}deg)`]
      .filter(Boolean)
      .join(" ");
  }

  return style;
};

const resolveStudioAssetSlotAsset = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  slot: StudioAssetSlot | null | undefined,
  context?: StudioRuntimeContext,
): StudioAsset | null => {
  if (!slot) return null;

  if (slot.inputId) {
    const input = document.inputs[slot.inputId];
    if (!input || input.type !== "image") return null;

    const value = getStudioRuntimeInputValue(input, values, context);
    if (!value) return null;

    return {
      id: `runtime:${input.id}`,
      label: input.label,
      src: value,
    };
  }

  return slot.assetId ? (document.assets[slot.assetId] ?? null) : null;
};

const getBackgroundSizeForFit = (fit: StudioAssetSlot["fit"]): string =>
  fit === "fill" ? "100% 100%" : (fit ?? "cover");

export function StudioRenderer({
  document,
  runtimeValues,
  rootNodeIds,
  runtimeContext,
  selectedNodeId,
  selectedNodeIds = [],
  resolveNodeBackgroundAssetSlot,
  onSelectNode,
  runtimeImageOverrides,
  backgroundOverride,
  onFontLoadStateChange,
}: StudioRendererProps) {
  const selectedNodeIdsSet = new Set(selectedNodeIds);

  const renderNode = (
    node: StudioGraphNode,
    inheritedContext: StudioRuntimeContext | undefined,
  ): React.ReactNode => {
    // 감춘 노드는 자손까지 함께 빠진다. 부모를 감췄는데 자식만 남으면 트리에서
    // 감춘 것과 화면에 남은 것이 어긋난다.
    if (node.hidden) return null;

    const nodeRuntimeContext = getStudioNodeRuntimeContext(
      node,
      inheritedContext,
    );
    const styleRecord = node.styleId
      ? document.styles[node.styleId]
      : undefined;
    const baseStyle = toCssStyle(
      getStudioObjectRenderStyle(styleRecord ?? {}, node.layoutMode),
    );
    const style =
      node.type === "shape"
        ? {
            ...baseStyle,
            ...getStudioShapeFillRenderStyle(
              resolveStudioShapeFill(
                node.shapeFill,
                styleRecord?.backgroundColor,
              ),
            ),
          }
        : baseStyle;
    const backgroundSlot = resolveNodeBackgroundAssetSlot
      ? resolveNodeBackgroundAssetSlot(node, nodeRuntimeContext)
      : getStudioNodeBackgroundAssetSlot(node);
    const backgroundAsset = resolveStudioAssetSlotAsset(
      document,
      runtimeValues,
      backgroundSlot,
      nodeRuntimeContext,
    );
    const resolvedStyle = backgroundAsset
      ? {
          ...style,
          backgroundImage: `url(${JSON.stringify(backgroundAsset.src)})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: getBackgroundSizeForFit(backgroundSlot?.fit),
        }
      : style;
    const isSelected =
      selectedNodeId === node.id || selectedNodeIdsSet.has(node.id);
    const children = getStudioPaintOrder(node.childIds)
      .map((childId) => document.graph.nodes[childId])
      .filter(Boolean)
      .map((childNode) => renderNode(childNode, nodeRuntimeContext));

    const commonProps = {
      "data-node-id": node.id,
      tabIndex: 0,
      onClick: (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        onSelectNode?.(node.id, event);
      },
      className: cn(
        "group/studio-node select-none",
        onSelectNode && (node.locked ? "cursor-default" : "cursor-move"),
        isSelected && "outline outline-2 outline-offset-2 outline-blue-500",
      ),
      "data-node-locked": node.locked ? "true" : undefined,
      style: resolvedStyle,
    };

    /**
     * 종류마다 그리는 법을 명시적으로 가른다.
     *
     * 모르는 종류를 글자로 그리는 마지막 갈래를 두지 않는다. 그 갈래가 있으면
     * union에 새로 넣은 종류가 빈 글자처럼 조용히 그려지고, 그 위에 나머지 기능을
     * 쌓게 된다.
     */
    switch (node.type) {
      case "group":
        return (
          <div key={node.id} {...commonProps}>
            {children}
          </div>
        );

      case "shape":
        // 도형은 style이 곧 표현이다. 채움과 테두리, 둥근 정도를 style이 갖는다.
        return (
          <div key={node.id} {...commonProps} data-studio-shape-node="true">
            {children}
          </div>
        );

      case "image": {
        const asset = resolveStudioAsset(
          document,
          runtimeValues,
          node.binding,
          nodeRuntimeContext,
        );
        const objectPosition = getStudioImageObjectPosition(styleRecord);
        const imageInputId =
          node.binding?.kind === "inputImage" ? node.binding.inputId : null;
        const runtimeImageOverride = imageInputId
          ? runtimeImageOverrides?.[imageInputId]
          : undefined;

        return (
          <div key={node.id} {...commonProps}>
            {asset?.src ? (
              // eslint-disable-next-line @next/next/no-img-element -- Runtime image inputs are plain URL/data sources in Template Studio.
              <img
                alt={asset.label}
                className="h-full w-full"
                draggable={false}
                src={asset.src}
                style={{
                  objectFit: node.fit ?? "cover",
                  objectPosition: runtimeImageOverride?.objectPosition
                    ? runtimeImageOverride.objectPosition
                    : formatStudioImageObjectPosition(objectPosition),
                  ...(runtimeImageOverride?.fit
                    ? { objectFit: runtimeImageOverride.fit }
                    : {}),
                  borderRadius: getStudioImageBorderRadius(styleRecord),
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">
                No image
              </div>
            )}
            {children}
          </div>
        );
      }

      case "flexibleText": {
        const text = resolveStudioTextBinding(
          document,
          runtimeValues,
          node.binding,
          nodeRuntimeContext,
        );

        return (
          <div key={node.id} {...commonProps}>
            <StudioText
              appearance={resolveStudioTextAppearance(node, styleRecord)}
              autoFit={{
                maxFontSize:
                  typeof styleRecord?.fontSize === "number"
                    ? styleRecord.fontSize
                    : 24,
                minFontSize: 10,
                styleRecord,
              }}
              className="m-0 block w-full leading-tight"
              text={text}
              typography={{
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight,
                letterSpacing: 0,
                lineHeight: style.lineHeight ?? 1.08,
              }}
            />
            {children}
          </div>
        );
      }

      case "text": {
        const text = resolveStudioTextBinding(
          document,
          runtimeValues,
          node.binding,
          nodeRuntimeContext,
        );

        return (
          <div key={node.id} {...commonProps}>
            <StudioText
              appearance={resolveStudioTextAppearance(node, styleRecord)}
              text={text}
            />
            {children}
          </div>
        );
      }

      default: {
        /**
         * 종류가 늘었는데 위에 갈래를 더하지 않으면 이 대입에서 컴파일이 깨진다.
         *
         * 화면에서는 예외를 던지지 않는다. 문서 한 곳이 어긋났다고 편집기 전체가
         * 흰 화면이 되면 되돌릴 방법조차 없어진다. 대신 무엇을 못 그렸는지 눈에
         * 보이게 남긴다.
         */
        const unhandledNodeType: never = node.type;
        return (
          <div
            key={node.id}
            {...commonProps}
            data-studio-unsupported-node-type={String(unhandledNodeType)}
          >
            <span className="flex h-full w-full items-center justify-center bg-rose-100 text-xs font-bold text-rose-600">
              Unsupported node
            </span>
          </div>
        );
      }
    }
  };

  return (
    <div
      className="relative shrink-0 overflow-visible"
      onClick={(event) => onSelectNode?.("", event)}
      style={{
        width: document.canvas.width,
        height: document.canvas.height,
        background:
          backgroundOverride === undefined
            ? document.canvas.background
            : (backgroundOverride ?? "transparent"),
      }}
    >
      <StudioWebFontLoader
        document={document}
        onLoadStateChange={onFontLoadStateChange}
      />
      {getStudioPaintOrder(rootNodeIds ?? document.graph.rootNodeIds)
        .map((nodeId) => document.graph.nodes[nodeId])
        .filter(Boolean)
        .map((node) => renderNode(node, runtimeContext))}
    </div>
  );
}
