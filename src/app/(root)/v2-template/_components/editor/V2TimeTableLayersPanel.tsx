import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Folder,
  Grid3X3,
  ImageIcon,
  Layers,
  Type,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { V2TemplateHighlightTarget } from "@/types/time-table/v2_template_editor_ui";
import {
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
} from "@/types/time-table/v2_template_render_config";

type V2LayerNode = V2TemplateLayerNode;

const v2_LAYER_ICON_MAP: Record<
  V2TemplateLayerIconKey,
  React.ComponentType<{ className?: string }>
> = {
  group: Folder,
  grid: Grid3X3,
  calendar: CalendarDays,
  image: ImageIcon,
  layers: Layers,
  text: Type,
};

interface V2TimeTableLayersPanelProps {
  onSelectLayer?: (payload: {
    target: V2TemplateHighlightTarget;
    sectionKey?: string;
    layerId: string;
  }) => void;
  orderedIdsByParent?: Record<string, string[]>;
  onReorderLayers?: (payload: {
    parentId: string;
    orderedIds: string[];
  }) => void;
}

const v2_ROOT_LAYER_PARENT_ID = "__root__" as const;
type V2LayerParentId = typeof v2_ROOT_LAYER_PARENT_ID | string;

const v2_moveLayerNode = (
  prevIds: string[],
  dragId: string,
  dropId: string,
  dropPosition: "before" | "after"
): string[] => {
  const dragIndex = prevIds.indexOf(dragId);
  const dropIndex = prevIds.indexOf(dropId);

  if (dragIndex < 0 || dropIndex < 0 || dragId === dropId) {
    return prevIds;
  }

  const nextIds = [...prevIds];
  nextIds.splice(dragIndex, 1);

  const targetIndex = nextIds.indexOf(dropId);
  if (targetIndex < 0) return prevIds;
  const insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
  nextIds.splice(insertIndex, 0, dragId);

  return nextIds;
};

const v2_toOrderMap = (
  parentId: V2LayerParentId,
  nodes: V2LayerNode[],
  map: Record<string, string[]>
) => {
  map[parentId] = nodes.map((node) => node.id);
  nodes.forEach((node) => {
    if (!node.children?.length) return;
    v2_toOrderMap(node.id, node.children, map);
  });
};

const v2_findNodeById = (
  nodes: V2LayerNode[],
  nodeId: string
): V2LayerNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (!node.children?.length) continue;
    const found = v2_findNodeById(node.children, nodeId);
    if (found) return found;
  }
  return null;
};

const v2_createInitialOrderMap = (
  layerTree: V2LayerNode[]
): Record<string, string[]> => {
  const initialOrderMap: Record<string, string[]> = {};
  v2_toOrderMap(v2_ROOT_LAYER_PARENT_ID, layerTree, initialOrderMap);
  return initialOrderMap;
};

const V2TimeTableLayersPanel: React.FC<V2TimeTableLayersPanelProps> = ({
  onSelectLayer,
  orderedIdsByParent,
  onReorderLayers,
}) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const {
    activeHighlightTarget,
    setActiveHighlightTarget,
    setHoverHighlightTarget,
    isLayerHidden,
    toggleLayerHidden,
  } = useV2TimeTableEditorRuntimeContext();
  const layerTree = useMemo(
    () => renderConfig.structure.layers,
    [renderConfig.structure.layers]
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    grid: true,
    profile: true,
    card: true,
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const fallbackOrderMap = useMemo(
    () => v2_createInitialOrderMap(layerTree),
    [layerTree]
  );
  const [orderedNodeIdsByParent, setOrderedNodeIdsByParent] =
    useState<Record<string, string[]>>({});
  const [dragState, setDragState] = useState<{
    parentId: V2LayerParentId;
    nodeId: string;
  } | null>(null);
  const [dropState, setDropState] = useState<{
    parentId: V2LayerParentId;
    nodeId: string;
    position: "before" | "after";
  } | null>(null);

  useEffect(() => {
    if (orderedIdsByParent) {
      setOrderedNodeIdsByParent(orderedIdsByParent);
      return;
    }
    setOrderedNodeIdsByParent(fallbackOrderMap);
  }, [fallbackOrderMap, orderedIdsByParent]);

  const activeTarget = activeHighlightTarget;
  const selectedNodeIds = useMemo(() => {
    const ids = new Set<string>();

    const visit = (node: V2LayerNode): boolean => {
      const childMatched = (node.children ?? []).some((child) => visit(child));
      const selfMatched = node.target !== undefined && node.target === activeTarget;
      if (selfMatched || childMatched) {
        ids.add(node.id);
      }
      return selfMatched || childMatched;
    };

    layerTree.forEach((node) => {
      visit(node);
    });

    return ids;
  }, [activeTarget, layerTree]);

  const toggleNode = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? false),
    }));
  };

  const getOrderedChildren = (
    parentId: V2LayerParentId,
    nodes: V2LayerNode[]
  ): V2LayerNode[] => {
    const orderedIds = orderedNodeIdsByParent[parentId];
    if (!orderedIds?.length) return nodes;

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const orderedNodes: V2LayerNode[] = [];

    orderedIds.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;
      orderedNodes.push(node);
      nodeMap.delete(id);
    });

    nodeMap.forEach((node) => {
      orderedNodes.push(node);
    });

    return orderedNodes;
  };

  const commitLayerOrder = ({
    parentId,
    orderedIds,
  }: {
    parentId: V2LayerParentId;
    orderedIds: string[];
  }) => {
    setOrderedNodeIdsByParent((prev) => ({
      ...prev,
      [parentId]: orderedIds,
    }));
    onReorderLayers?.({
      parentId,
      orderedIds,
    });
  };

  const renderNode = (
    node: V2LayerNode,
    depth = 0,
    parentId: V2LayerParentId,
    ancestorHidden = false
  ): React.ReactNode => {
    const hasChildren = Boolean(node.children?.length);
    const isOpen = expanded[node.id] ?? false;
    const ChevronIcon = isOpen ? ChevronDown : ChevronRight;
    const iconByKey =
      node.icon !== undefined ? v2_LAYER_ICON_MAP[node.icon] : undefined;
    const Icon = node.kind === "group" ? Folder : iconByKey ?? Layers;
    const isSelected = selectedNodeIds.has(node.id) || selectedLayerId === node.id;
    const isDragging =
      dragState?.parentId === parentId && dragState.nodeId === node.id;
    const isDropTargetBefore =
      dropState?.parentId === parentId &&
      dropState.nodeId === node.id &&
      dropState.position === "before";
    const isDropTargetAfter =
      dropState?.parentId === parentId &&
      dropState.nodeId === node.id &&
      dropState.position === "after";
    const isSelfHidden = isLayerHidden(node.id);
    const isEffectivelyHidden = ancestorHidden || isSelfHidden;
    const isInheritedHidden = ancestorHidden && !isSelfHidden;
    const VisibilityIcon = isEffectivelyHidden ? EyeOff : Eye;
    const parentNode =
      parentId === v2_ROOT_LAYER_PARENT_ID
        ? null
        : v2_findNodeById(layerTree, parentId);
    const orderedSiblings = getOrderedChildren(
      parentId,
      parentId === v2_ROOT_LAYER_PARENT_ID
        ? layerTree
        : (parentNode?.children ?? [])
    );
    const orderedSiblingIds = orderedSiblings.map((layerNode) => layerNode.id);
    const isReorderable =
      orderedSiblingIds.length > 1 && (node.target !== undefined || hasChildren);

    return (
      <div key={node.id} className="space-y-1">
        {isDropTargetBefore && (
          <div
            className="ml-2 mr-1 h-[2px] rounded bg-[#4f8cff]"
            style={{ marginLeft: `${depth * 14 + 8}px` }}
          />
        )}
        <div
          className={`flex items-center gap-1 rounded px-2 py-1 transition ${
            isSelected ? "bg-[#2a3447] text-[#d8e5ff]" : "text-gray-300 hover:bg-[#1b1f27]"
          } ${isDragging ? "opacity-50" : isEffectivelyHidden ? "opacity-50" : "opacity-100"}`}
          draggable={isReorderable}
          onDragStart={(event) => {
            if (!isReorderable) return;
            setDragState({
              parentId,
              nodeId: node.id,
            });
            setDropState(null);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.id);
          }}
          onDragEnd={() => {
            setDragState(null);
            setDropState(null);
          }}
          onDragOver={(event) => {
            if (!dragState) return;
            if (dragState.parentId !== parentId) return;
            if (dragState.nodeId === node.id) return;

            event.preventDefault();
            const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
            const offsetY = event.clientY - rect.top;
            const nextPosition = offsetY < rect.height / 2 ? "before" : "after";
            setDropState({
              parentId,
              nodeId: node.id,
              position: nextPosition,
            });
          }}
          onDrop={(event) => {
            if (!dragState || !dropState) return;
            if (dragState.parentId !== parentId || dropState.parentId !== parentId) {
              return;
            }
            if (dragState.nodeId === node.id) return;
            event.preventDefault();

            const nextOrder = v2_moveLayerNode(
              orderedSiblingIds,
              dragState.nodeId,
              node.id,
              dropState.position
            );
            commitLayerOrder({
              parentId,
              orderedIds: nextOrder,
            });
            setDropState(null);
            setDragState(null);
          }}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onMouseEnter={() => {
            if (node.target) setHoverHighlightTarget(node.target);
          }}
          onMouseLeave={() => setHoverHighlightTarget(null)}
        >
          {isReorderable ? (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#5d6f95]">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="inline-block h-5 w-5 shrink-0" />
          )}
          {hasChildren ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2a2f3a]"
              onClick={() => toggleNode(node.id)}
            >
              <ChevronIcon className="h-3.5 w-3.5 text-gray-500" />
            </button>
          ) : (
            <span className="inline-block h-5 w-5 shrink-0" />
          )}

          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => {
              const resolvedTarget = node.target ?? `layer:${node.id}`;
              setSelectedLayerId(node.id);
              setActiveHighlightTarget(resolvedTarget);
              onSelectLayer?.({
                target: resolvedTarget,
                sectionKey: node.sectionKey,
                layerId: node.id,
              });
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate text-xs font-medium">{node.label}</span>
            {node.isTemplateComponent ? (
              <span className="shrink-0 rounded border border-[#3f6ad8] bg-[#1a2b57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b9ccff]">
                Component
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2a2f3a] ${
              isInheritedHidden ? "text-[#5d6473]" : "text-[#99a8c9]"
            }`}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              toggleLayerHidden(node.id);
            }}
            draggable={false}
            aria-label={isSelfHidden ? `${node.label} 보이기` : `${node.label} 숨기기`}
            title={isSelfHidden ? "보이기" : "숨기기"}
          >
            <VisibilityIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        {isDropTargetAfter && (
          <div
            className="ml-2 mr-1 h-[2px] rounded bg-[#4f8cff]"
            style={{ marginLeft: `${depth * 14 + 8}px` }}
          />
        )}
        {hasChildren && isOpen && (
          <div className="space-y-1">
            {getOrderedChildren(node.id, node.children ?? []).map((child) =>
              renderNode(child, depth + 1, node.id, isEffectivelyHidden)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="v2-dark-form-theme h-full min-h-0 w-full border-r border-[#303848] bg-[#121722]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-[#303848] px-3 py-3">
          <h3 className="text-sm font-semibold text-gray-100">Layers</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {getOrderedChildren(v2_ROOT_LAYER_PARENT_ID, layerTree).map(
            (node) => renderNode(node, 0, v2_ROOT_LAYER_PARENT_ID, false)
          )}
        </div>
      </div>
    </div>
  );
};

export default V2TimeTableLayersPanel;
