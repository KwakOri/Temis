"use client";

import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { cn } from "@/lib/utils";
import {
  StudioGraphNode,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  resolveStudioAsset,
  resolveStudioTextBinding,
} from "@/utils/template-studio/binding-resolver";
import { type StudioRuntimeContext } from "@/utils/template-studio/input-values";

interface StudioRendererProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  rootNodeIds?: string[];
  runtimeContext?: StudioRuntimeContext;
  selectedNodeId?: string | null;
  selectedNodeIds?: string[];
  onSelectNode?: (
    nodeId: string,
    event?: React.MouseEvent<HTMLDivElement>,
  ) => void;
}

const toCssStyle = (styleRecord?: StudioStyleRecord): React.CSSProperties => {
  if (!styleRecord) return { position: "absolute" };

  const { rotateDeg, ...rest } = styleRecord;
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

const getNumericStyleValue = (
  styleRecord: StudioStyleRecord | undefined,
  key: string,
  fallback: number,
): number => {
  const value = styleRecord?.[key];
  return typeof value === "number" ? value : fallback;
};

export function StudioRenderer({
  document,
  runtimeValues,
  rootNodeIds,
  runtimeContext,
  selectedNodeId,
  selectedNodeIds = [],
  onSelectNode,
}: StudioRendererProps) {
  const selectedNodeIdsSet = new Set(selectedNodeIds);

  const renderNode = (node: StudioGraphNode): React.ReactNode => {
    const styleRecord = node.styleId
      ? document.styles[node.styleId]
      : undefined;
    const style = toCssStyle(styleRecord);
    const isSelected =
      selectedNodeId === node.id || selectedNodeIdsSet.has(node.id);
    const children = node.childIds
      .map((childId) => document.graph.nodes[childId])
      .filter(Boolean)
      .map((childNode) => renderNode(childNode));

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
      style,
    };

    if (node.type === "group") {
      return (
        <div key={node.id} {...commonProps}>
          {children}
        </div>
      );
    }

    if (node.type === "image") {
      const asset = resolveStudioAsset(
        document,
        runtimeValues,
        node.binding,
        runtimeContext,
      );

      return (
        <div key={node.id} {...commonProps}>
          {asset?.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- Runtime image inputs are plain URL/data sources in Template Studio.
            <img
              alt={asset.label}
              className="h-full w-full"
              draggable={false}
              src={asset.src}
              style={{ objectFit: node.fit ?? "cover" }}
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

    const text = resolveStudioTextBinding(
      document,
      runtimeValues,
      node.binding,
      runtimeContext,
    );

    if (node.type === "flexibleText") {
      const maxFontSize = getNumericStyleValue(styleRecord, "fontSize", 24);

      return (
        <div key={node.id} {...commonProps}>
          <AutoResizeText
            className="m-0 block w-full leading-tight"
            maxFontSize={maxFontSize}
            minFontSize={10}
            multiline
            style={{
              color: style.color,
              fontFamily: style.fontFamily,
              fontWeight: style.fontWeight,
              letterSpacing: 0,
              lineHeight: style.lineHeight ?? 1.08,
            }}
          >
            {text || " "}
          </AutoResizeText>
          {children}
        </div>
      );
    }

    return (
      <div key={node.id} {...commonProps}>
        {text || "\u00a0"}
        {children}
      </div>
    );
  };

  return (
    <div
      className="relative shrink-0 overflow-visible"
      onClick={(event) => onSelectNode?.("", event)}
      style={{
        width: document.canvas.width,
        height: document.canvas.height,
        background: document.canvas.background,
      }}
    >
      {(rootNodeIds ?? document.graph.rootNodeIds)
        .map((nodeId) => document.graph.nodes[nodeId])
        .filter(Boolean)
        .map((node) => renderNode(node))}
    </div>
  );
}
