"use client";

import { EyeOff, Lock } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

import {
  getStudioLayerIndent,
  StudioLayerDropIndicator,
  StudioLayerPanelFrame,
  StudioLayerRow,
} from "@/components/studio/layers/studio-layer-primitives";
import { StudioNodeTypeIcon } from "@/components/studio/node-type-icon";
import { cn } from "@/lib/utils";
import type { StudioNodeGraph } from "@/types/template-studio";
import type { StudioGraphDropPosition } from "@/utils/template-studio/graph-editor";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import { getStudioLayerPanelOrder } from "@/utils/template-studio/layer-order";

export interface StudioLayerDropState {
  nodeId: string;
  position: StudioGraphDropPosition;
  blockedReason?: string | null;
}

export interface StudioLayerPanelProps {
  title: string;
  summary: ReactNode;
  graph: StudioNodeGraph;
  /** 패널에 보여줄 최상위 노드. 그래프의 rootNodeIds와 다를 수 있다. */
  rootNodeIds: string[];
  selectedNodeIds: ReadonlySet<string>;
  /** 접어둔 그룹 */
  collapsedNodeIds: ReadonlySet<string>;
  /** 잘라내기 표시할 노드 */
  cutNodeIds?: ReadonlySet<string>;
  dropState?: StudioLayerDropState | null;
  onSelect: (
    nodeId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onToggleCollapsed: (nodeId: string) => void;
  onDragStart: (
    event: React.DragEvent<HTMLButtonElement>,
    nodeId: string,
  ) => void;
  onDragOver: (
    event: React.DragEvent<HTMLButtonElement>,
    nodeId: string,
  ) => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent<HTMLElement>, nodeId: string) => void;
  onIndicatorDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    nodeId: string,
    position: "before" | "after",
  ) => void;
}

/**
 * 일반 그래프용 공통 레이어 패널.
 *
 * `StudioNodeGraph`를 트리로 보여주고 선택, 접기, 드래그 이동 의도를 밖으로
 * 알린다. 그래프를 직접 바꾸지 않는다. 두 Studio가 같은 패널을 쓴다.
 */
export function StudioLayerPanel({
  title,
  summary,
  graph,
  rootNodeIds,
  selectedNodeIds,
  collapsedNodeIds,
  cutNodeIds,
  dropState = null,
  onSelect,
  onToggleCollapsed,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onIndicatorDragOver,
}: StudioLayerPanelProps) {
  const renderNode = (
    nodeId: string,
    depth = 0,
    visitedNodeIds: Set<string> = new Set(),
  ): ReactNode => {
    const node = graph.nodes[nodeId];
    if (!node) return null;

    if (visitedNodeIds.has(nodeId)) {
      return (
        <div
          className="rounded px-2 py-1 text-[11px] font-semibold text-rose-300"
          key={`${nodeId}:cycle`}
          style={{ marginLeft: getStudioLayerIndent(depth) }}
        >
          Cycle: {node.label}
        </div>
      );
    }

    const nextVisitedNodeIds = new Set(visitedNodeIds);
    nextVisitedNodeIds.add(nodeId);
    const activeDropState = dropState?.nodeId === node.id ? dropState : null;
    const isInsideDropActive = activeDropState?.position === "inside";
    const isCollapsibleGroup =
      node.type === "group" && node.childIds.length > 0;
    const isCollapsed = collapsedNodeIds.has(node.id);

    return (
      <div className="min-w-0 max-w-full overflow-hidden" key={node.id}>
        {activeDropState?.position === "before" ? (
          <StudioLayerDropIndicator
            blockedReason={activeDropState.blockedReason}
            depth={depth}
            position="before"
            onDragOver={(event) =>
              onIndicatorDragOver(event, node.id, "before")
            }
            onDrop={(event) => onDrop(event, node.id)}
          />
        ) : null}
        <StudioLayerRow
          badge={
            isInsideDropActive ? (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em]",
                  activeDropState?.blockedReason
                    ? "bg-rose-400/15 text-rose-300"
                    : "bg-[var(--sel)] text-[var(--accent)]",
                )}
              >
                {activeDropState?.blockedReason ? "Blocked" : "Inside"}
              </span>
            ) : null
          }
          blockedReason={activeDropState?.blockedReason}
          collapsed={isCollapsed}
          collapsible={isCollapsibleGroup}
          cut={cutNodeIds?.has(node.id) ?? false}
          depth={depth}
          draggable={!node.locked}
          hidden={node.hidden ?? false}
          icon={<StudioNodeTypeIcon type={node.type} />}
          label={node.label}
          ring={
            isInsideDropActive
              ? activeDropState?.blockedReason
                ? "blocked"
                : "accent"
              : "none"
          }
          selected={selectedNodeIds.has(node.id)}
          stateIcon={
            <>
              {node.hidden ? (
                <EyeOff className="h-3.5 w-3.5 shrink-0 text-[var(--fg3)]" />
              ) : null}
              {node.locked ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--fg3)]" />
              ) : null}
            </>
          }
          typeLabel={getStudioGraphNodeTypeLabel(node.type)}
          onClick={(event) => onSelect(node.id, event)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => onDragOver(event, node.id)}
          onDragStart={(event) => onDragStart(event, node.id)}
          onDrop={(event) => onDrop(event, node.id)}
          onToggleCollapsed={() => onToggleCollapsed(node.id)}
        />
        {activeDropState?.position === "after" ? (
          <StudioLayerDropIndicator
            blockedReason={activeDropState.blockedReason}
            depth={depth}
            position="after"
            onDragOver={(event) => onIndicatorDragOver(event, node.id, "after")}
            onDrop={(event) => onDrop(event, node.id)}
          />
        ) : null}
        {!isCollapsed
          ? getStudioLayerPanelOrder(node.childIds).map((childId) =>
              renderNode(childId, depth + 1, nextVisitedNodeIds),
            )
          : null}
      </div>
    );
  };

  return (
    <StudioLayerPanelFrame summary={summary} title={title}>
      {getStudioLayerPanelOrder(rootNodeIds).map((nodeId) =>
        renderNode(nodeId),
      )}
    </StudioLayerPanelFrame>
  );
}
