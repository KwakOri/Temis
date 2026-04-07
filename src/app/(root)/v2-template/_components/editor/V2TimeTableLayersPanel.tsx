import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Folder,
  Grid3X3,
  ImageIcon,
  Layers,
  Type,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { V2TemplateHighlightTarget } from "@/types/time-table/v2_template_editor_ui";

type V2LayerNode = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  target?: V2TemplateHighlightTarget;
  children?: V2LayerNode[];
};

interface V2TimeTableLayersPanelProps {
  onSelectLayer?: (target: V2TemplateHighlightTarget) => void;
  orderedIdsByParent?: Record<string, string[]>;
  onReorderLayers?: (payload: {
    parentId: string;
    orderedIds: string[];
  }) => void;
}

const v2_ROOT_LAYER_PARENT_ID = "__root__" as const;
type V2LayerParentId = typeof v2_ROOT_LAYER_PARENT_ID | string;

const v2_REORDERABLE_PARENT_ID_SET = new Set<V2LayerParentId>([
  v2_ROOT_LAYER_PARENT_ID,
  "profile",
  "card",
]);

const v2_LAYER_REORDERABLE_NODE_ID_SET = new Set<string>([
  "grid",
  "week-flag",
  "top-object",
  "profile",
  "card",
  "profile-image",
  "profile-frame",
  "streaming-day",
  "streaming-date",
  "streaming-time",
  "main-title",
  "sub-title",
]);

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

const v2_createInitialOrderMap = (): Record<string, string[]> => {
  const initialOrderMap: Record<string, string[]> = {};
  v2_toOrderMap(v2_ROOT_LAYER_PARENT_ID, v2_LAYER_TREE, initialOrderMap);
  return initialOrderMap;
};

const v2_LAYER_TREE: V2LayerNode[] = [
  {
    id: "grid",
    label: "Grid",
    icon: Grid3X3,
    target: "grid",
  },
  {
    id: "week-flag",
    label: "WeekFlag",
    icon: CalendarDays,
    target: "weekFlag",
  },
  {
    id: "top-object",
    label: "TopObject",
    icon: ImageIcon,
    target: "topObjectContainer",
  },
  {
    id: "profile",
    label: "Profile",
    icon: Folder,
    children: [
      {
        id: "profile-image",
        label: "Image",
        icon: ImageIcon,
        target: "profileImage",
      },
      {
        id: "profile-frame",
        label: "Frame",
        icon: Layers,
        target: "profileFrame",
      },
    ],
  },
  {
    id: "card",
    label: "Card",
    icon: Folder,
    target: "cardContainer",
    children: [
      {
        id: "streaming-day",
        label: "StreamingDay",
        icon: Type,
        target: "cardStreamingDay",
      },
      {
        id: "streaming-date",
        label: "StreamingDate",
        icon: Type,
        target: "cardStreamingDate",
      },
      {
        id: "streaming-time",
        label: "StreamingTime",
        icon: Type,
        target: "cardStreamingTime",
      },
      {
        id: "main-title",
        label: "MainTitle",
        icon: Type,
        target: "cardMainTitleContainer",
      },
      {
        id: "sub-title",
        label: "SubTitle",
        icon: Type,
        target: "cardSubTitleContainer",
      },
    ],
  },
];

const V2TimeTableLayersPanel: React.FC<V2TimeTableLayersPanelProps> = ({
  onSelectLayer,
  orderedIdsByParent,
  onReorderLayers,
}) => {
  const {
    activeHighlightTarget,
    setActiveHighlightTarget,
    setHoverHighlightTarget,
  } = useV2TimeTableEditorRuntimeContext();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    profile: true,
    card: true,
  });
  const [orderedNodeIdsByParent, setOrderedNodeIdsByParent] =
    useState<Record<string, string[]>>(() =>
      orderedIdsByParent ? { ...orderedIdsByParent } : v2_createInitialOrderMap()
    );
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
    if (!orderedIdsByParent) return;
    setOrderedNodeIdsByParent(orderedIdsByParent);
  }, [orderedIdsByParent]);

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

    v2_LAYER_TREE.forEach((node) => {
      visit(node);
    });

    return ids;
  }, [activeTarget]);

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
    parentId: V2LayerParentId
  ): React.ReactNode => {
    const hasChildren = Boolean(node.children?.length);
    const isOpen = expanded[node.id] ?? false;
    const ChevronIcon = isOpen ? ChevronDown : ChevronRight;
    const Icon = hasChildren ? Folder : node.icon ?? Layers;
    const isSelected = selectedNodeIds.has(node.id);
    const isReorderable =
      v2_REORDERABLE_PARENT_ID_SET.has(parentId) &&
      v2_LAYER_REORDERABLE_NODE_ID_SET.has(node.id);
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
    const orderedSiblings = getOrderedChildren(
      parentId,
      parentId === v2_ROOT_LAYER_PARENT_ID
        ? v2_LAYER_TREE
        : (v2_LAYER_TREE.find((layerNode) => layerNode.id === parentId)?.children ??
            node.children ??
            [])
    );
    const orderedSiblingIds = orderedSiblings.map((layerNode) => layerNode.id);

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
          } ${isDragging ? "opacity-50" : "opacity-100"}`}
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
              if (node.target) {
                setActiveHighlightTarget(node.target);
                onSelectLayer?.(node.target);
              } else if (hasChildren) {
                toggleNode(node.id);
              }
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate text-xs font-medium">{node.label}</span>
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
              renderNode(child, depth + 1, node.id)
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
          {getOrderedChildren(v2_ROOT_LAYER_PARENT_ID, v2_LAYER_TREE).map(
            (node) => renderNode(node, 0, v2_ROOT_LAYER_PARENT_ID)
          )}
        </div>
      </div>
    </div>
  );
};

export default V2TimeTableLayersPanel;
