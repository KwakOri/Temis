import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Component,
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

import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
} from "@/types/time-table/template-render-config";

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
  layerTree?: V2LayerNode[];
  componentCatalog?: Array<{
    id: string;
    label: string;
    rootNodeId: string;
    rootLayerId: string | null;
    firstInstanceLayerId: string | null;
    kind: "template" | "custom";
    instanceMode: "component" | "detached";
    instanceCount: number;
  }>;
  onSelectLayer?: (payload: {
    target?: V2TemplateHighlightTarget;
    sectionKey?: string;
    layerId: string;
    editorMode: "instance" | "master";
  }) => void;
  orderedIdsByParent?: Record<string, string[]>;
  onReorderLayers?: (payload: {
    parentId: string;
    orderedIds: string[];
  }) => void;
  canRelocateLayer?: (layerId: string) => boolean;
  onRelocateLayers?: (payload: {
    layerId: string;
    sourceParentId: string;
    targetParentId: string;
    targetIndex: number;
  }) => void;
  onDetachComponent?: (componentId: string) => void;
}

const v2_ROOT_LAYER_PARENT_ID = "__root__" as const;
type V2LayerParentId = typeof v2_ROOT_LAYER_PARENT_ID | string;
type V2DropPosition = "before" | "after" | "inside";

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

const v2_isDescendantLayer = ({
  nodes,
  ancestorId,
  targetId,
}: {
  nodes: V2LayerNode[];
  ancestorId: string;
  targetId: string;
}): boolean => {
  const ancestorNode = v2_findNodeById(nodes, ancestorId);
  if (!ancestorNode?.children?.length) return false;

  const queue = [...ancestorNode.children];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.id === targetId) return true;
    if (current.children?.length) {
      queue.push(...current.children);
    }
  }

  return false;
};

const v2_createInitialOrderMap = (
  layerTree: V2LayerNode[]
): Record<string, string[]> => {
  const initialOrderMap: Record<string, string[]> = {};
  v2_toOrderMap(v2_ROOT_LAYER_PARENT_ID, layerTree, initialOrderMap);
  return initialOrderMap;
};

const V2TimeTableLayersPanel: React.FC<V2TimeTableLayersPanelProps> = ({
  layerTree: layerTreeProp,
  componentCatalog = [],
  onSelectLayer,
  orderedIdsByParent,
  onReorderLayers,
  canRelocateLayer,
  onRelocateLayers,
  onDetachComponent,
}) => {
  const {
    activeHighlightTarget,
    setActiveHighlightTarget,
    setHoverHighlightTarget,
    isLayerHidden,
    toggleLayerHidden,
  } = useTemplateEditorRuntimeContext();
  const layerTree = useMemo(() => {
    return layerTreeProp ?? [];
  }, [layerTreeProp]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    grid: true,
    profile: true,
    card: true,
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [lastSelectedLayerId, setLastSelectedLayerId] = useState<string | null>(
    null
  );
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"layers" | "components">("layers");
  const defaultOrderMap = useMemo(
    () => v2_createInitialOrderMap(layerTree),
    [layerTree]
  );
  const [orderedNodeIdsByParent, setOrderedNodeIdsByParent] =
    useState<Record<string, string[]>>({});
  const [dragState, setDragState] = useState<{
    parentId: V2LayerParentId;
    nodeId: string;
    siblingIds: string[];
  } | null>(null);
  const [dropState, setDropState] = useState<{
    parentId: V2LayerParentId;
    nodeId: string;
    position: V2DropPosition;
    blockedReason?: string | null;
  } | null>(null);
  const [dragFeedback, setDragFeedback] = useState<{
    tone: "info" | "error";
    message: string;
  } | null>(null);
  const componentIdByRootLayerId = useMemo(() => {
    const map = new Map<string, string>();
    componentCatalog.forEach((componentItem) => {
      if (!componentItem.rootLayerId) return;
      map.set(componentItem.rootLayerId, componentItem.id);
    });
    return map;
  }, [componentCatalog]);

  useEffect(() => {
    if (!dragFeedback) return;
    const timeout = setTimeout(() => setDragFeedback(null), 1800);
    return () => clearTimeout(timeout);
  }, [dragFeedback]);

  useEffect(() => {
    if (orderedIdsByParent) {
      setOrderedNodeIdsByParent(orderedIdsByParent);
      return;
    }
    setOrderedNodeIdsByParent(defaultOrderMap);
  }, [defaultOrderMap, orderedIdsByParent]);

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

  const moveSelectedLayersByStep = (step: -1 | 1) => {
    const selectedIds =
      selectedLayerIds.length > 0
        ? selectedLayerIds
        : selectedLayerId
          ? [selectedLayerId]
          : [];
    if (selectedIds.length === 0) return;

    const parentCandidates = new Set<V2LayerParentId>();
    Object.entries(orderedNodeIdsByParent).forEach(([parentId, ids]) => {
      if (selectedIds.some((id) => ids.includes(id))) {
        parentCandidates.add(parentId);
      }
    });

    if (parentCandidates.size !== 1) {
      setDragFeedback({
        tone: "error",
        message: "같은 그룹의 레이어만 함께 이동할 수 있습니다.",
      });
      return;
    }

    const parentId = Array.from(parentCandidates)[0];
    const siblingIds = [...(orderedNodeIdsByParent[parentId] ?? [])];
    if (siblingIds.length === 0) return;

    const selectedSet = new Set(selectedIds);
    const selectedInOrder = siblingIds.filter((id) => selectedSet.has(id));
    if (selectedInOrder.length === 0) return;

    const selectedIndices = selectedInOrder
      .map((id) => siblingIds.indexOf(id))
      .filter((index) => index >= 0);
    if (selectedIndices.length === 0) return;

    const minIndex = Math.min(...selectedIndices);
    const maxIndex = Math.max(...selectedIndices);

    if (step < 0 && minIndex === 0) return;
    if (step > 0 && maxIndex === siblingIds.length - 1) return;

    const remaining = siblingIds.filter((id) => !selectedSet.has(id));
    const beforeId = step < 0 ? siblingIds[minIndex - 1] : undefined;
    const afterId = step > 0 ? siblingIds[maxIndex + 1] : undefined;

    let insertIndex = 0;
    if (step < 0) {
      const beforeIndex = beforeId ? remaining.indexOf(beforeId) : -1;
      insertIndex = Math.max(0, beforeIndex);
    } else {
      const afterIndex = afterId ? remaining.indexOf(afterId) : -1;
      insertIndex = Math.max(0, afterIndex + 1);
    }

    const nextOrder = [...remaining];
    nextOrder.splice(insertIndex, 0, ...selectedInOrder);
    commitLayerOrder({
      parentId,
      orderedIds: nextOrder,
    });
    setDragFeedback({
      tone: "info",
      message:
        step < 0
          ? "선택한 레이어를 위로 이동했습니다."
          : "선택한 레이어를 아래로 이동했습니다.",
    });
  };

  const handleLayersKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (
    event
  ) => {
    if (activeTab !== "layers") return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      if (!selectedLayerId) return;

      const parentEntry = Object.entries(orderedNodeIdsByParent).find(([, ids]) =>
        ids.includes(selectedLayerId)
      );
      if (!parentEntry) return;

      const [, siblingIds] = parentEntry;
      setSelectedLayerIds(siblingIds);
      setDragFeedback({
        tone: "info",
        message: `현재 그룹의 ${siblingIds.length}개 레이어를 선택했습니다.`,
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (selectedLayerId) {
        setSelectedLayerIds([selectedLayerId]);
      } else {
        setSelectedLayerIds([]);
      }
      return;
    }

    const relocateSelectedLayerByKeyboard = (direction: "left" | "right") => {
      if (!selectedLayerId) return;
      if (selectedLayerIds.length > 1) {
        setDragFeedback({
          tone: "error",
          message: "키보드 그룹 이동은 단일 선택에서만 지원됩니다.",
        });
        return;
      }

      const sourceParentEntry = Object.entries(orderedNodeIdsByParent).find(
        ([, ids]) => ids.includes(selectedLayerId)
      );
      if (!sourceParentEntry) return;
      const [sourceParentId, sourceSiblingIds] = sourceParentEntry;
      const sourceIndex = sourceSiblingIds.indexOf(selectedLayerId);
      if (sourceIndex < 0) return;

      if (
        sourceParentId !== v2_ROOT_LAYER_PARENT_ID &&
        !canRelocateLayer?.(selectedLayerId)
      ) {
        setDragFeedback({
          tone: "error",
          message: "이 레이어는 그룹 이동이 잠겨 있습니다.",
        });
        return;
      }

      if (direction === "left") {
        if (sourceParentId === v2_ROOT_LAYER_PARENT_ID) return;

        const targetParentEntry = Object.entries(orderedNodeIdsByParent).find(
          ([, ids]) => ids.includes(sourceParentId)
        );
        const targetParentId = targetParentEntry?.[0] ?? v2_ROOT_LAYER_PARENT_ID;
        const targetSiblingIds = [
          ...(orderedNodeIdsByParent[targetParentId] ?? []),
        ];
        const sourceParentIndex = targetSiblingIds.indexOf(sourceParentId);
        if (sourceParentIndex < 0) return;
        const targetIndex = sourceParentIndex + 1;

        setOrderedNodeIdsByParent((prev) => {
          const nextSourceIds = (prev[sourceParentId] ?? []).filter(
            (id) => id !== selectedLayerId
          );
          const nextTargetIds = [...(prev[targetParentId] ?? [])];
          nextTargetIds.splice(targetIndex, 0, selectedLayerId);
          return {
            ...prev,
            [sourceParentId]: nextSourceIds,
            [targetParentId]: nextTargetIds,
          };
        });
        onRelocateLayers?.({
          layerId: selectedLayerId,
          sourceParentId,
          targetParentId,
          targetIndex,
        });
        setDragFeedback({
          tone: "info",
          message: "레이어를 한 단계 바깥 그룹으로 이동했습니다.",
        });
        return;
      }

      const prevSiblingId = sourceSiblingIds[sourceIndex - 1];
      if (!prevSiblingId) return;
      const targetGroupNode = v2_findNodeById(layerTree, prevSiblingId);
      if (!targetGroupNode || targetGroupNode.kind !== "group") {
        setDragFeedback({
          tone: "error",
          message: "오른쪽 이동은 이전 형제 그룹이 있을 때만 가능합니다.",
        });
        return;
      }

      const targetParentId = targetGroupNode.id;
      const targetIndex = (orderedNodeIdsByParent[targetParentId] ?? []).length;

      setOrderedNodeIdsByParent((prev) => {
        const nextSourceIds = (prev[sourceParentId] ?? []).filter(
          (id) => id !== selectedLayerId
        );
        const nextTargetIds = [...(prev[targetParentId] ?? [])];
        nextTargetIds.splice(targetIndex, 0, selectedLayerId);
        return {
          ...prev,
          [sourceParentId]: nextSourceIds,
          [targetParentId]: nextTargetIds,
        };
      });
      onRelocateLayers?.({
        layerId: selectedLayerId,
        sourceParentId,
        targetParentId,
        targetIndex,
      });
      setDragFeedback({
        tone: "info",
        message: "레이어를 이전 그룹 하위로 이동했습니다.",
      });
    };

    if (event.altKey && event.shiftKey && event.key === "ArrowLeft") {
      event.preventDefault();
      relocateSelectedLayerByKeyboard("left");
      return;
    }

    if (event.altKey && event.shiftKey && event.key === "ArrowRight") {
      event.preventDefault();
      relocateSelectedLayerByKeyboard("right");
      return;
    }

    if (!event.altKey) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    event.preventDefault();
    moveSelectedLayersByStep(event.key === "ArrowUp" ? -1 : 1);
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
    const isSelected =
      selectedNodeIds.has(node.id) || selectedLayerIds.includes(node.id);
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
    const isDropTargetInside =
      dropState?.nodeId === node.id && dropState.position === "inside";
    const isDropTargetBlocked =
      (isDropTargetBefore || isDropTargetAfter || isDropTargetInside) &&
      Boolean(dropState?.blockedReason);
    const dropBlockedReason =
      isDropTargetBlocked && dropState?.blockedReason
        ? dropState.blockedReason
        : null;
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
    const childOrderedIds = getOrderedChildren(node.id, node.children ?? []).map(
      (layerNode) => layerNode.id
    );
    const isReorderable = node.target !== undefined || hasChildren;
    const canDropInside = node.kind === "group";

    return (
      <div key={node.id} className="space-y-1">
        {isDropTargetBefore && (
          <div
            className={`ml-2 mr-1 h-[2px] rounded ${
              isDropTargetBlocked ? "bg-[#ef4444]" : "bg-[#4f8cff]"
            }`}
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
              siblingIds: orderedSiblingIds,
            });
            setDropState(null);
            setDragFeedback(null);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.id);
          }}
          onDragEnd={() => {
            setDragState(null);
            setDropState(null);
          }}
          onDragOver={(event) => {
            if (!dragState) return;
            if (dragState.nodeId === node.id) return;

            const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
            const offsetY = event.clientY - rect.top;
            const nextPosition =
              canDropInside &&
              offsetY > rect.height * 0.32 &&
              offsetY < rect.height * 0.68
                ? "inside"
                : offsetY < rect.height / 2
                  ? "before"
                  : "after";
            const previewTargetParentId =
              nextPosition === "inside" ? node.id : parentId;
            let blockedReason: string | null = null;
            if (
              previewTargetParentId !== dragState.parentId &&
              !canRelocateLayer?.(dragState.nodeId)
            ) {
              blockedReason = "이 레이어는 다른 그룹으로 이동할 수 없습니다.";
            } else if (
              v2_isDescendantLayer({
                nodes: layerTree,
                ancestorId: dragState.nodeId,
                targetId: previewTargetParentId,
              })
            ) {
              blockedReason = "자기 하위 레이어 안으로는 이동할 수 없습니다.";
            }

            event.preventDefault();
            setDropState({
              parentId,
              nodeId: node.id,
              position: nextPosition,
              blockedReason,
            });
            if (blockedReason) {
              setDragFeedback({
                tone: "error",
                message: blockedReason,
              });
            } else {
              setDragFeedback(null);
            }
          }}
          onDrop={(event) => {
            if (!dragState || !dropState) return;
            if (dragState.nodeId === node.id) return;
            event.preventDefault();

            if (dropState.blockedReason) {
              setDragFeedback({
                tone: "error",
                message: dropState.blockedReason,
              });
              setDropState(null);
              setDragState(null);
              return;
            }

            const targetParentId =
              dropState.position === "inside" ? node.id : parentId;
            const rawTargetIndex =
              dropState.position === "inside"
                ? childOrderedIds.length
                : orderedSiblingIds.indexOf(node.id) +
                  (dropState.position === "after" ? 1 : 0);
            const targetIndex = Math.max(0, rawTargetIndex);
            if (
              v2_isDescendantLayer({
                nodes: layerTree,
                ancestorId: dragState.nodeId,
                targetId: targetParentId,
              })
            ) {
              setDropState(null);
              setDragState(null);
              return;
            }

            if (
              targetParentId === dragState.parentId &&
              dropState.position !== "inside"
            ) {
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
              setDragFeedback({
                tone: "info",
                message: "레이어 순서를 변경했습니다.",
              });
              setDropState(null);
              setDragState(null);
              return;
            }
            if (!canRelocateLayer?.(dragState.nodeId)) {
              setDragFeedback({
                tone: "error",
                message: "이 레이어는 그룹 이동이 잠겨 있습니다.",
              });
              setDropState(null);
              setDragState(null);
              return;
            }

            setOrderedNodeIdsByParent((prev) => {
              const sourceIds = dragState.siblingIds.filter(
                (id) => id !== dragState.nodeId
              );
              const targetSource =
                targetParentId === dragState.parentId
                  ? sourceIds
                  : (prev[targetParentId] ?? []);
              const targetIds = targetSource.filter((id) => id !== dragState.nodeId);
              const insertIndex = Math.max(0, Math.min(targetIds.length, targetIndex));
              targetIds.splice(insertIndex, 0, dragState.nodeId);

              return {
                ...prev,
                [dragState.parentId]: sourceIds,
                [targetParentId]: targetIds,
              };
            });

            onRelocateLayers?.({
              layerId: dragState.nodeId,
              sourceParentId: dragState.parentId,
              targetParentId,
              targetIndex,
            });
            setDragFeedback({
              tone: "info",
              message: "레이어를 새 그룹으로 이동했습니다.",
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
            onClick={(event) => {
              const resolvedTarget = node.target;
              const withModifier = event.metaKey || event.ctrlKey;
              const withRange = event.shiftKey;

              let nextSelectedLayerIds: string[] = [];
              if (
                withRange &&
                lastSelectedLayerId &&
                orderedSiblingIds.includes(lastSelectedLayerId)
              ) {
                const anchorIndex = orderedSiblingIds.indexOf(lastSelectedLayerId);
                const currentIndex = orderedSiblingIds.indexOf(node.id);
                const [from, to] =
                  anchorIndex < currentIndex
                    ? [anchorIndex, currentIndex]
                    : [currentIndex, anchorIndex];
                nextSelectedLayerIds = orderedSiblingIds.slice(from, to + 1);
              } else if (withModifier) {
                if (selectedLayerIds.includes(node.id)) {
                  nextSelectedLayerIds = selectedLayerIds.filter(
                    (id) => id !== node.id
                  );
                } else {
                  nextSelectedLayerIds = [...selectedLayerIds, node.id];
                }

                if (nextSelectedLayerIds.length === 0) {
                  nextSelectedLayerIds = [node.id];
                }
              } else {
                nextSelectedLayerIds = [node.id];
              }

              setSelectedComponentId(null);
              setSelectedLayerIds(nextSelectedLayerIds);
              setLastSelectedLayerId(node.id);
              setSelectedLayerId(node.id);
              setActiveHighlightTarget(resolvedTarget ?? null);
              onSelectLayer?.({
                ...(resolvedTarget ? { target: resolvedTarget } : {}),
                sectionKey: node.sectionKey,
                layerId: node.id,
                editorMode: "instance",
              });
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate text-xs font-medium">{node.label}</span>
            {node.isTemplateComponent ? (
              <>
                <span className="shrink-0 rounded border border-[#3f6ad8] bg-[#1a2b57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b9ccff]">
                  Component
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded border border-[#4f8cff] bg-[#1f355f] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#d6e6ff] hover:bg-[#27457a]"
                  onClick={(event) => {
                    event.stopPropagation();
                    const componentId = componentIdByRootLayerId.get(node.id);
                    if (componentId) {
                      setSelectedComponentId(componentId);
                    } else {
                      setSelectedComponentId(null);
                    }
                    setSelectedLayerIds([node.id]);
                    setLastSelectedLayerId(node.id);
                    setSelectedLayerId(node.id);
                    onSelectLayer?.({
                      ...(node.target ? { target: node.target } : {}),
                      sectionKey: node.sectionKey,
                      layerId: node.id,
                      editorMode: "master",
                    });
                  }}
                  aria-label={`${node.label} 마스터 편집`}
                  title="마스터 편집 열기"
                >
                  Master
                </button>
              </>
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
        {isDropTargetInside && (
          <div
            className={`ml-2 mr-1 rounded border border-dashed px-2 py-1 text-[10px] ${
              isDropTargetBlocked
                ? "border-[#ef4444]/80 bg-[#ef4444]/10 text-[#f5b8b8]"
                : "border-[#4f8cff]/90 bg-[#4f8cff]/10 text-[#9ec1ff]"
            }`}
            style={{ marginLeft: `${depth * 14 + 22}px` }}
          >
            {isDropTargetBlocked ? "이동 불가" : "하위로 이동"}
          </div>
        )}
        {isDropTargetAfter && (
          <div
            className={`ml-2 mr-1 h-[2px] rounded ${
              isDropTargetBlocked ? "bg-[#ef4444]" : "bg-[#4f8cff]"
            }`}
            style={{ marginLeft: `${depth * 14 + 8}px` }}
          />
        )}
        {dropBlockedReason ? (
          <div
            className="ml-2 mr-1 rounded border border-[#8a4f4f] bg-[#2a1b1b] px-2 py-1 text-[10px] text-[#f2b7b7]"
            style={{ marginLeft: `${depth * 14 + 22}px` }}
          >
            {dropBlockedReason}
          </div>
        ) : null}
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
        <div className="border-b border-[#303848] px-3 py-3 space-y-2">
          <h3 className="text-sm font-semibold text-gray-100">Structure</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("layers");
                setSelectedComponentId(null);
                if (selectedLayerId) {
                  setSelectedLayerIds([selectedLayerId]);
                }
              }}
              className={`rounded border px-2 py-1.5 text-xs font-semibold ${
                activeTab === "layers"
                  ? "border-[#4f8cff] bg-[#1f355f] text-[#d6e6ff]"
                  : "border-[#354056] bg-[#171e2b] text-[#9db2d8] hover:bg-[#1f2838]"
              }`}
            >
              Layers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("components")}
              className={`rounded border px-2 py-1.5 text-xs font-semibold ${
                activeTab === "components"
                  ? "border-[#4f8cff] bg-[#1f355f] text-[#d6e6ff]"
                  : "border-[#354056] bg-[#171e2b] text-[#9db2d8] hover:bg-[#1f2838]"
              }`}
            >
              Components
            </button>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto p-2"
          tabIndex={0}
          onKeyDown={handleLayersKeyDown}
        >
          {activeTab === "layers" ? (
            <div className="mb-2 rounded border border-[#2f394d] bg-[#151c28] px-2 py-1.5 text-[10px] text-[#8ca2c8]">
              다중 선택: `Cmd/Ctrl + 클릭` / 범위 선택: `Shift + 클릭` / 이동:
              `Alt + ↑/↓` / 그룹 이동: `Alt + Shift + ←/→`
            </div>
          ) : null}
          {dragFeedback ? (
            <div
              className={`mb-2 rounded border px-2 py-1.5 text-[11px] ${
                dragFeedback.tone === "error"
                  ? "border-[#8a4f4f] bg-[#2a1b1b] text-[#f2b7b7]"
                  : "border-[#3b5b8b] bg-[#14233d] text-[#9ec1ff]"
              }`}
            >
              {dragFeedback.message}
            </div>
          ) : null}
          {activeTab === "layers" ? (
            getOrderedChildren(v2_ROOT_LAYER_PARENT_ID, layerTree).map(
              (node) => renderNode(node, 0, v2_ROOT_LAYER_PARENT_ID, false)
            )
          ) : (
            <div className="space-y-2">
              {componentCatalog.length === 0 ? (
                <div className="rounded border border-[#2f394d] bg-[#151c28] px-2 py-2 text-[11px] text-[#8ca2c8]">
                  등록된 컴포넌트가 없습니다.
                </div>
              ) : (
              componentCatalog.map((componentItem) => (
                <div
                  key={componentItem.id}
                  className={`space-y-2 rounded border px-2 py-2 transition ${
                    selectedComponentId === componentItem.id
                      ? "border-[#4f8cff] bg-[#18243a]"
                      : "border-[#2f394d] bg-[#151c28]"
                  }`}
                >
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left transition ${
                      selectedComponentId === componentItem.id
                        ? "bg-[#1d2d49]"
                        : "hover:bg-[#1d2636]"
                    }`}
                    onClick={() => {
                      if (!componentItem.rootLayerId) return;
                      setSelectedComponentId(componentItem.id);
                      setSelectedLayerIds([componentItem.rootLayerId]);
                      setLastSelectedLayerId(componentItem.rootLayerId);
                      setSelectedLayerId(componentItem.rootLayerId);
                      onSelectLayer?.({
                        layerId: componentItem.rootLayerId,
                          editorMode: "master",
                        });
                      }}
                    >
                      <Component className="h-3.5 w-3.5 shrink-0 text-[#9ab3dd]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#d3e2ff]">
                          {componentItem.label}
                        </p>
                        <p className="truncate text-[10px] text-[#7f92b5]">
                          {componentItem.kind} / {componentItem.instanceMode}
                        </p>
                        <p className="truncate text-[10px] text-[#7f92b5]">
                          instances: {componentItem.instanceCount}
                        </p>
                      </div>
                      <span className="shrink-0 rounded border border-[#3f6ad8] bg-[#1a2b57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b9ccff]">
                        Master
                      </span>
                    </button>
                    {componentItem.instanceMode !== "detached" ? (
                      <button
                        type="button"
                        className="w-full rounded border border-[#8a4f4f] bg-[#2a1b1b] px-2 py-1 text-[11px] font-semibold text-[#f2b7b7] hover:bg-[#352020]"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDetachComponent?.(componentItem.id);
                        }}
                      >
                        Detach (되돌릴 수 없음)
                      </button>
                    ) : (
                      <div className="w-full rounded border border-[#3b5b8b] bg-[#14233d] px-2 py-1 text-[11px] font-semibold text-[#9ec1ff]">
                        Detached
                      </div>
                    )}
                    <button
                      type="button"
                      className="w-full rounded border border-[#3f6ad8] bg-[#1a2b57] px-2 py-1 text-[11px] font-semibold text-[#b9ccff] hover:bg-[#22376f]"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!componentItem.rootLayerId) return;
                        setSelectedComponentId(componentItem.id);
                        setSelectedLayerIds([componentItem.rootLayerId]);
                        setLastSelectedLayerId(componentItem.rootLayerId);
                        setSelectedLayerId(componentItem.rootLayerId);
                        onSelectLayer?.({
                          layerId: componentItem.rootLayerId,
                          editorMode: "master",
                        });
                      }}
                    >
                      마스터 편집 열기
                    </button>
                    {componentItem.firstInstanceLayerId ? (
                      <button
                        type="button"
                        className="w-full rounded border border-[#3a5f9e] bg-[#182643] px-2 py-1 text-[11px] font-semibold text-[#a8c7ff] hover:bg-[#1d2e51]"
                        onClick={(event) => {
                          event.stopPropagation();
                          const firstInstanceLayerId =
                            componentItem.firstInstanceLayerId;
                          if (!firstInstanceLayerId) return;
                          setActiveTab("layers");
                          setSelectedComponentId(componentItem.id);
                          setSelectedLayerIds([firstInstanceLayerId]);
                          setLastSelectedLayerId(firstInstanceLayerId);
                          setSelectedLayerId(firstInstanceLayerId);
                          onSelectLayer?.({
                            layerId: firstInstanceLayerId,
                            editorMode: "instance",
                          });
                        }}
                      >
                        첫 인스턴스 이동
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V2TimeTableLayersPanel;
