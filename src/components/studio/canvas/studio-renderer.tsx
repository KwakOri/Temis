"use client";

import React from "react";

import { cn } from "@/lib/utils";
import {
  StudioAssetSlot,
  StudioGraphNode,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  resolveStudioAsset,
  resolveStudioAssetSlot,
  resolveStudioTextBinding,
} from "@/utils/template-studio/binding-resolver";
import { getStudioNodeBackgroundAssetSlot } from "@/utils/template-studio/graph-nodes";
import { resolveStudioTextAppearance } from "@/utils/template-studio/text-appearance";
import { type StudioRuntimeContext } from "@/utils/template-studio/input-values";
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
import {
  getStudioDefaultFontFamily,
  resolveStudioFontFamily,
} from "@/utils/template-studio/web-fonts";
import { StudioText } from "@/components/studio/text/studio-text";
import type { StudioRuntimeImageOverrides } from "@/utils/thumbnail-studio/runtime-image-transform";

import {
  getStudioObjectCssStyle,
  getStudioBackgroundSizeForFit,
} from "@/utils/template-studio/object-style";

interface StudioRendererProps {
  showImagePlaceholders?: boolean;
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
  runtimeImageOverrides?: StudioRuntimeImageOverrides;
  backgroundOverride?: string | null;
  onFontLoadStateChange?: (
    state: import("./studio-web-font-loader").StudioWebFontLoadState,
  ) => void;
}

/**
 * Text SVG and its logical HTML measurement span must use the same font metrics.
 * Keep layout/position declarations on the node wrapper and pass only typography
 * declarations to StudioText so visual layers cannot accidentally change flex sizing.
 */
const getStudioTextTypography = (
  style: React.CSSProperties,
): React.CSSProperties => ({
  fontFamily: style.fontFamily,
  fontSize: style.fontSize,
  fontStyle: style.fontStyle,
  fontVariant: style.fontVariant,
  fontWeight: style.fontWeight,
  letterSpacing: style.letterSpacing,
  lineHeight: style.lineHeight,
  textAlign: style.textAlign,
});

export function StudioRenderer({
  showImagePlaceholders = true,
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

  const defaultFontFamily = getStudioDefaultFontFamily(document) ?? null;
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
    const baseStyle = getStudioObjectCssStyle(
      getStudioObjectRenderStyle(styleRecord ?? {}, node.layoutMode),
    );
    if (node.type === "text" || node.type === "flexibleText") {
      baseStyle.fontFamily = resolveStudioFontFamily(
        document,
        styleRecord?.fontFamily,
        defaultFontFamily,
      );
    }
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
    const backgroundAsset = resolveStudioAssetSlot(
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
          backgroundSize: getStudioBackgroundSizeForFit(backgroundSlot?.fit),
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
        const imageTransform = runtimeImageOverride?.transforms?.[node.id];
        const intrinsicSize = runtimeImageOverride?.fit
          ? undefined
          : runtimeImageOverride?.intrinsicSize;
        const image = asset?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Runtime images use local blob URLs or document assets.
          <img
            alt={asset.label}
            className="h-full w-full"
            draggable={false}
            src={asset.src}
            data-studio-runtime-image={imageInputId ?? undefined}
            style={
              imageTransform
                ? {
                    position: "absolute",
                    left: `${imageTransform.left * 100}%`,
                    top: `${imageTransform.top * 100}%`,
                    width: `${imageTransform.width * 100}%`,
                    height: `${imageTransform.height * 100}%`,
                    maxWidth: "none",
                    objectFit: "fill",
                    transform: `rotate(${imageTransform.rotateDeg}deg)`,
                    transformOrigin: "center",
                  }
                : intrinsicSize
                  ? {
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: intrinsicSize.width,
                      height: intrinsicSize.height,
                      maxWidth: "none",
                      objectFit: "fill",
                      transform: "translate(-50%, -50%)",
                    }
                  : {
                      objectFit:
                        runtimeImageOverride?.fit ?? node.fit ?? "cover",
                      objectPosition:
                        runtimeImageOverride?.objectPosition ??
                        formatStudioImageObjectPosition(objectPosition),
                      borderRadius: getStudioImageBorderRadius(styleRecord),
                    }
            }
          />
        ) : null;

        return (
          <div key={node.id} {...commonProps}>
            {image ? (
              imageInputId ? (
                <div
                  data-studio-image-slot={node.id}
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    borderRadius: getStudioImageBorderRadius(styleRecord),
                  }}
                >
                  {image}
                </div>
              ) : (
                image
              )
            ) : showImagePlaceholders ? (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">
                No image
              </div>
            ) : null}
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
                ...getStudioTextTypography(style),
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
              typography={getStudioTextTypography(style)}
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
