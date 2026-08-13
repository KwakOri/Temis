"use client";

import { ChevronRight, LocateFixed } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { StudioNodeId, StudioTemplateDocument } from "@/types/template-studio";

export interface StudioPickerNode {
  id: StudioNodeId;
  label: string;
  typeLabel: string;
  parentId?: StudioNodeId | null;
  childIds: StudioNodeId[];
}

interface StudioNodePickerMenuProps {
  document?: StudioTemplateDocument;
  nodes?: Record<StudioNodeId, StudioPickerNode>;
  nodeIds: StudioNodeId[];
  position: { x: number; y: number };
  selectedNodeId?: StudioNodeId | null;
  onClose: () => void;
  onSelectNode: (nodeId: StudioNodeId) => void;
}

interface PickerTreeNode {
  id: StudioNodeId;
  childIds: StudioNodeId[];
}

const buildPickerTree = (
  nodes: Record<StudioNodeId, StudioPickerNode>,
  nodeIds: StudioNodeId[],
) => {
  const included = new Set<StudioNodeId>();
  const hitOrder = new Map<StudioNodeId, number>();

  nodeIds.forEach((nodeId, index) => {
    hitOrder.set(nodeId, index);

    let current: StudioPickerNode | null = nodes[nodeId] ?? null;
    while (current) {
      included.add(current.id);
      current = current.parentId ? (nodes[current.parentId] ?? null) : null;
    }
  });

  const scoreNode = (nodeId: StudioNodeId): number => {
    if (hitOrder.has(nodeId)) return hitOrder.get(nodeId) ?? 0;

    const node = nodes[nodeId];
    if (!node) return Number.MAX_SAFE_INTEGER;

    const childScores = node.childIds
      .filter((childId) => included.has(childId))
      .map(scoreNode);

    return childScores.length > 0
      ? Math.min(...childScores)
      : Number.MAX_SAFE_INTEGER;
  };

  const treeById = new Map<StudioNodeId, PickerTreeNode>();
  included.forEach((nodeId) => {
    treeById.set(nodeId, { id: nodeId, childIds: [] });
  });

  const roots: StudioNodeId[] = [];
  included.forEach((nodeId) => {
    const node = nodes[nodeId];
    if (!node) return;

    const parentId = node.parentId;
    if (parentId && included.has(parentId)) {
      treeById.get(parentId)?.childIds.push(nodeId);
    } else {
      roots.push(nodeId);
    }
  });

  treeById.forEach((treeNode) => {
    treeNode.childIds.sort((a, b) => scoreNode(a) - scoreNode(b));
  });
  roots.sort((a, b) => scoreNode(a) - scoreNode(b));

  return { roots, treeById, hitSet: new Set(nodeIds) };
};

export function StudioNodePickerMenu({
  document,
  nodes: suppliedNodes,
  nodeIds,
  position,
  selectedNodeId,
  onClose,
  onSelectNode,
}: StudioNodePickerMenuProps) {
  const nodes = useMemo<Record<StudioNodeId, StudioPickerNode>>(() => {
    if (suppliedNodes) return suppliedNodes;
    if (!document) return {};

    return Object.fromEntries(
      Object.values(document.graph.nodes).map((node) => [
        node.id,
        {
          id: node.id,
          label: node.label,
          typeLabel:
            node.type === "flexibleText"
              ? "Auto Text"
              : node.type[0].toUpperCase() + node.type.slice(1),
          parentId: node.parentId,
          childIds: node.childIds,
        },
      ]),
    );
  }, [document, suppliedNodes]);
  const { roots, treeById, hitSet } = useMemo(
    () => buildPickerTree(nodes, nodeIds),
    [nodeIds, nodes],
  );
  const [expandedIds, setExpandedIds] = useState<Set<StudioNodeId>>(
    () => new Set(Array.from(treeById.keys())),
  );

  useEffect(() => {
    setExpandedIds(new Set(Array.from(treeById.keys())));
  }, [treeById]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (nodeIds.length === 0) return null;

  const toggleExpanded = (nodeId: StudioNodeId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (nodeId: StudioNodeId, depth = 0): React.ReactNode => {
    const node = nodes[nodeId];
    const treeNode = treeById.get(nodeId);
    if (!node || !treeNode) return null;

    const hasChildren = treeNode.childIds.length > 0;
    const isExpanded = expandedIds.has(nodeId);
    const isSelected = selectedNodeId === nodeId;

    return (
      <div key={nodeId}>
        <div
          className={cn(
            "grid h-8 grid-cols-[20px_1fr_auto] items-center gap-1 rounded px-1 text-xs",
            isSelected
              ? "bg-[#274f93] text-white"
              : "text-[#c8d6f2] hover:bg-[#182131]",
          )}
          style={{ paddingLeft: 4 + depth * 14 }}
        >
          {hasChildren ? (
            <button
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="flex h-5 w-5 items-center justify-center rounded text-[#9ec1ff] transition hover:bg-[#22314a]"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(nodeId);
              }}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
          ) : (
            <span className="h-5 w-5" />
          )}

          <button
            className="min-w-0 text-left"
            type="button"
            onClick={() => {
              onSelectNode(nodeId);
              onClose();
            }}
          >
            <span className="block truncate font-semibold">{node.label}</span>
            <span className="block truncate text-[10px] uppercase tracking-wide text-[#8fa6cf]">
              {node.typeLabel}
              {hitSet.has(nodeId) ? " · Hit" : " · Parent"}
            </span>
          </button>

          <button
            aria-label={`Select ${node.label}`}
            className="flex h-6 w-6 items-center justify-center rounded text-[#8fa6cf] transition hover:bg-[#22314a] hover:text-white"
            title="Select this object"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelectNode(nodeId);
              onClose();
            }}
          >
            <LocateFixed className="h-3.5 w-3.5" />
          </button>
        </div>

        {hasChildren && isExpanded ? (
          <div className="mt-0.5 grid gap-0.5">
            {treeNode.childIds.map((childId) => renderNode(childId, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className="fixed z-[80] w-72 rounded-lg border border-[#303848] bg-[#121722]/98 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
      style={{
        left:
          typeof window === "undefined"
            ? position.x
            : Math.min(position.x, window.innerWidth - 304),
        top:
          typeof window === "undefined"
            ? position.y
            : Math.min(position.y, window.innerHeight - 360),
      }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#303848] px-1 pb-2">
        <div>
          <div className="text-xs font-black text-[#d7e5ff]">Select object</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8fa6cf]">
            {nodeIds.length} overlapping hits
          </div>
        </div>
        <button
          className="rounded px-2 py-1 text-xs font-bold text-[#8fa6cf] transition hover:bg-[#182131] hover:text-white"
          type="button"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <div className="grid gap-0.5">
          {roots.map((nodeId) => renderNode(nodeId))}
        </div>
      </div>
    </div>
  );
}
