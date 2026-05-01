import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Folder,
  Grid3X3,
  ImageIcon,
  Layers,
  Lock,
  Type,
  Unlock,
} from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
} from "@/types/time-table/template-render-config";
import { v2_SCENE_STRUCTURE_MESSAGES } from "@/utils/v2/template-scene-structure-messages";
import {
  v2_findNodeById,
  v2_getOrderedChildren,
  v2_isDescendantLayer,
  V2LayerParentId,
  v2_moveLayerBlock,
  v2_moveLayerNode,
  v2_ROOT_LAYER_PARENT_ID,
  V2DropPosition,
} from "./layers-dnd";
import { V2LayersComponentItem } from "./layers-components-tab";

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

type V2LayerTreeDragState = {
  parentId: V2LayerParentId;
  nodeId: string;
  siblingIds: string[];
  draggedNodeIds: string[];
} | null;

type V2LayerTreeDropState = {
  parentId: V2LayerParentId;
  nodeId: string;
  position: V2DropPosition;
  blockedReason?: string | null;
} | null;

interface V2LayersTreeProps {
  layerTree: V2LayerNode[];
  componentCatalog: V2LayersComponentItem[];
  selectedNodeIds: Set<string>;
  selectedLayerIds: string[];
  lastSelectedLayerId: string | null;
  orderedNodeIdsByParent: Record<string, string[]>;
  dragState: V2LayerTreeDragState;
  dropState: V2LayerTreeDropState;
  extractableComponentInstanceLayerIdSet?: Set<string>;
  isLayerHidden: (layerId: string) => boolean;
  isLayerLocked: (layerId: string) => boolean;
  canRelocateLayer?: (layerId: string) => boolean;
  expanded: Record<string, boolean>;
  onToggleNode: (id: string) => void;
  onSetSelectedComponentId: (componentId: string | null) => void;
  onSetSelectedLayerIds: (layerIds: string[]) => void;
  onSetLastSelectedLayerId: (layerId: string) => void;
  onSetSelectedLayerId: (layerId: string) => void;
  onSetActiveHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  onSetHoverHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  onToggleLayerHidden: (layerId: string) => void;
  onToggleLayerLocked: (layerId: string) => void;
  onSetDragState: (state: V2LayerTreeDragState) => void;
  onSetDropState: (state: V2LayerTreeDropState) => void;
  onSetDragFeedback: (
    feedback:
      | {
          tone: "info" | "error";
          message: string;
        }
      | null
  ) => void;
  onCommitLayerOrder: (payload: {
    parentId: V2LayerParentId;
    orderedIds: string[];
  }) => void;
  onRelocateLayers?: (payload: {
    layerId: string;
    sourceParentId: string;
    targetParentId: string;
    targetIndex: number;
  }) => void;
  onSelectLayer?: (payload: {
    target?: V2TemplateHighlightTarget;
    sectionKey?: string;
    layerId: string;
    editorMode: "instance" | "master";
  }) => void;
  onExtractComponentInstanceLayerCopy?: (layerId: string) => void;
  onMoveComponentInstanceLayerToRoot?: (layerId: string) => void;
  onCreateSceneNodeFromLayerMenu?: (payload: {
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
    layerId?: string | null;
  }) => void;
}

const V2LayersTree: React.FC<V2LayersTreeProps> = ({
  layerTree,
  componentCatalog,
  selectedNodeIds,
  selectedLayerIds,
  lastSelectedLayerId,
  orderedNodeIdsByParent,
  dragState,
  dropState,
  extractableComponentInstanceLayerIdSet,
  isLayerHidden,
  isLayerLocked,
  canRelocateLayer,
  expanded,
  onToggleNode,
  onSetSelectedComponentId,
  onSetSelectedLayerIds,
  onSetLastSelectedLayerId,
  onSetSelectedLayerId,
  onSetActiveHighlightTarget,
  onSetHoverHighlightTarget,
  onToggleLayerHidden,
  onToggleLayerLocked,
  onSetDragState,
  onSetDropState,
  onSetDragFeedback,
  onCommitLayerOrder,
  onRelocateLayers,
  onSelectLayer,
  onExtractComponentInstanceLayerCopy,
  onMoveComponentInstanceLayerToRoot,
  onCreateSceneNodeFromLayerMenu,
}) => {
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    layerId: string | null;
    layerLabel: string | null;
    layerKind: V2LayerNode["kind"] | "root";
  } | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!contextMenu) return;

    const closeContextMenu = () => setContextMenu(null);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        contextMenuRef.current &&
        target &&
        contextMenuRef.current.contains(target)
      ) {
        return;
      }
      closeContextMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("scroll", closeContextMenu, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenu, true);
    };
  }, [contextMenu]);

  const openNodeContextMenu = ({
    event,
    node,
  }: {
    event: React.MouseEvent;
    node: V2LayerNode;
  }) => {
    event.preventDefault();
    event.stopPropagation();
    const resolvedTarget = node.target;
    onSetSelectedComponentId(null);
    onSetSelectedLayerIds([node.id]);
    onSetLastSelectedLayerId(node.id);
    onSetSelectedLayerId(node.id);
    onSetActiveHighlightTarget(resolvedTarget ?? null);
    onSelectLayer?.({
      ...(resolvedTarget ? { target: resolvedTarget } : {}),
      sectionKey: node.sectionKey,
      layerId: node.id,
      editorMode: "instance",
    });
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      layerId: node.id,
      layerLabel: node.label,
      layerKind: node.kind,
    });
  };

  const openRootContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      layerId: null,
      layerLabel: null,
      layerKind: "root",
    });
  };

  const handleContextCreateNode = (
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection"
  ) => {
    if (!contextMenu) return;
    onCreateSceneNodeFromLayerMenu?.({
      kind,
      layerId: contextMenu.layerId,
    });
    setContextMenu(null);
  };

  const contextMenuLabel =
    contextMenu?.layerKind === "root"
      ? "루트 레이어"
      : contextMenu?.layerLabel ?? "선택 레이어";

  const contextMenuCreateOptions: Array<{
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
    label: string;
  }> = [
    { kind: "text", label: "텍스트 생성" },
    { kind: "flexibleText", label: "적응형 텍스트 생성" },
    { kind: "asset", label: "에셋 생성" },
    { kind: "group", label: "그룹 생성" },
    { kind: "cardCollection", label: "카드 컬렉션 생성" },
  ];
  const contextMenuElement = contextMenu ? (
    <div
      ref={contextMenuRef}
      className="fixed z-[220] min-w-[220px] rounded border border-[#354056] bg-[#161d2a] p-1.5 shadow-2xl"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="mb-1 flex items-center gap-2 border-b border-[#2b3446] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#90a6cc]">
        <Boxes className="h-3 w-3" />
        <span>{contextMenuLabel}</span>
      </div>
      <div className="space-y-1">
        {contextMenuCreateOptions.map((option) => (
          <button
            key={`context-create-${option.kind}`}
            type="button"
            className="flex w-full items-center justify-start rounded px-2 py-1.5 text-left text-[11px] text-[#d7e4ff] hover:bg-[#24344f]"
            onClick={() => handleContextCreateNode(option.kind)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  ) : null;
  const getOrderedChildren = (
    parentId: V2LayerParentId,
    nodes: V2LayerNode[]
  ): V2LayerNode[] =>
    v2_getOrderedChildren({
      orderedNodeIdsByParent,
      parentId,
      nodes,
    });

  const renderNode = (
    node: V2LayerNode,
    depth = 0,
    parentId: V2LayerParentId,
    ancestorHidden = false
  ): React.ReactNode => {
    const isVirtualNode = node.isVirtual === true;
    const hasChildren = Boolean(node.children?.length);
    const isOpen = expanded[node.id] ?? false;
    const ChevronIcon = isOpen ? ChevronDown : ChevronRight;
    const iconByKey =
      node.icon !== undefined ? v2_LAYER_ICON_MAP[node.icon] : undefined;
    const Icon = node.kind === "group" ? Folder : iconByKey ?? Layers;
    const isSelected =
      selectedNodeIds.has(node.id) || selectedLayerIds.includes(node.id);
    const isDragging =
      dragState?.parentId === parentId &&
      dragState.draggedNodeIds.includes(node.id);
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
    const isSelfLocked = isLayerLocked(node.id);
    const LockIcon = isSelfLocked ? Lock : Unlock;
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
    const isReorderable =
      !isVirtualNode &&
      !isSelfLocked &&
      (node.target !== undefined || hasChildren);
    const canDropInside = node.kind === "group";
    const isExtractableComponentInstance =
      Boolean(extractableComponentInstanceLayerIdSet?.has(node.id)) &&
      !hasChildren;

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
            const siblingSelection = selectedLayerIds.filter((id) =>
              orderedSiblingIds.includes(id)
            );
            const draggedNodeIds =
              selectedLayerIds.includes(node.id) && siblingSelection.length > 1
                ? orderedSiblingIds.filter((id) => siblingSelection.includes(id))
                : [node.id];
            if (draggedNodeIds.some((draggedId) => isLayerLocked(draggedId))) {
              event.preventDefault();
              onSetDragFeedback({
                tone: "error",
                message: "잠긴 레이어는 이동할 수 없습니다.",
              });
              return;
            }
            onSetDragState({
              parentId,
              nodeId: node.id,
              siblingIds: orderedSiblingIds,
              draggedNodeIds,
            });
            onSetDropState(null);
            onSetDragFeedback(null);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", draggedNodeIds.join(","));
          }}
          onDragEnd={() => {
            onSetDragState(null);
            onSetDropState(null);
          }}
          onDragOver={(event) => {
            if (!dragState) return;
            if (dragState.draggedNodeIds.includes(node.id)) return;

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
              dragState.draggedNodeIds.some(
                (draggedId) => !canRelocateLayer?.(draggedId)
              )
            ) {
              blockedReason =
                v2_SCENE_STRUCTURE_MESSAGES.RELOCATE_CROSS_GROUP_LOCKED;
            } else if (
              dragState.draggedNodeIds.some((draggedId) =>
                v2_isDescendantLayer({
                  nodes: layerTree,
                  ancestorId: draggedId,
                  targetId: previewTargetParentId,
                })
              )
            ) {
              blockedReason = v2_SCENE_STRUCTURE_MESSAGES.DESCENDANT_BLOCKED;
            }

            event.preventDefault();
            onSetDropState({
              parentId,
              nodeId: node.id,
              position: nextPosition,
              blockedReason,
            });
            if (blockedReason) {
              onSetDragFeedback({
                tone: "error",
                message: blockedReason,
              });
            } else {
              onSetDragFeedback(null);
            }
          }}
          onDrop={(event) => {
            if (!dragState || !dropState) return;
            if (dragState.draggedNodeIds.includes(node.id)) return;
            event.preventDefault();

            if (dropState.blockedReason) {
              onSetDragFeedback({
                tone: "error",
                message: dropState.blockedReason,
              });
              onSetDropState(null);
              onSetDragState(null);
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
              dragState.draggedNodeIds.some((draggedId) =>
                v2_isDescendantLayer({
                  nodes: layerTree,
                  ancestorId: draggedId,
                  targetId: targetParentId,
                })
              )
            ) {
              onSetDropState(null);
              onSetDragState(null);
              return;
            }

            if (
              targetParentId === dragState.parentId &&
              dropState.position !== "inside"
            ) {
              const nextOrder =
                dragState.draggedNodeIds.length > 1
                  ? v2_moveLayerBlock({
                      prevIds: orderedSiblingIds,
                      draggedIds: dragState.draggedNodeIds,
                      dropId: node.id,
                      dropPosition: dropState.position,
                    })
                  : v2_moveLayerNode(
                      orderedSiblingIds,
                      dragState.nodeId,
                      node.id,
                      dropState.position
                    );
              onCommitLayerOrder({
                parentId,
                orderedIds: nextOrder,
              });
              onSetDragFeedback({
                tone: "info",
                message:
                  dragState.draggedNodeIds.length > 1
                    ? `${dragState.draggedNodeIds.length}개 레이어 순서를 변경했습니다.`
                    : "레이어 순서를 변경했습니다.",
              });
              onSetDropState(null);
              onSetDragState(null);
              return;
            }
            if (
              dragState.draggedNodeIds.some(
                (draggedId) => !canRelocateLayer?.(draggedId)
              )
            ) {
              onSetDragFeedback({
                tone: "error",
                message: v2_SCENE_STRUCTURE_MESSAGES.RELOCATE_LOCKED,
              });
              onSetDropState(null);
              onSetDragState(null);
              return;
            }

            const draggedSet = new Set(dragState.draggedNodeIds);
            const sourceIds = dragState.siblingIds.filter((id) => !draggedSet.has(id));
            const targetSource =
              targetParentId === dragState.parentId
                ? sourceIds
                : (orderedNodeIdsByParent[targetParentId] ?? []);
            const targetIds = targetSource.filter((id) => !draggedSet.has(id));
            const insertIndex = Math.max(0, Math.min(targetIds.length, targetIndex));
            targetIds.splice(insertIndex, 0, ...dragState.draggedNodeIds);

            onCommitLayerOrder({
              parentId: dragState.parentId,
              orderedIds: sourceIds,
            });
            onCommitLayerOrder({
              parentId: targetParentId,
              orderedIds: targetIds,
            });

            dragState.draggedNodeIds.forEach((draggedId, index) => {
              onRelocateLayers?.({
                layerId: draggedId,
                sourceParentId: dragState.parentId,
                targetParentId,
                targetIndex: targetIndex + index,
              });
            });
            onSetDragFeedback({
              tone: "info",
              message:
                dragState.draggedNodeIds.length > 1
                  ? `${dragState.draggedNodeIds.length}개 레이어를 새 그룹으로 이동했습니다.`
                  : "레이어를 새 그룹으로 이동했습니다.",
            });
            onSetDropState(null);
            onSetDragState(null);
          }}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onContextMenu={(event) => {
            if (isVirtualNode) return;
            openNodeContextMenu({ event, node });
          }}
          onMouseEnter={() => {
            if (node.target) onSetHoverHighlightTarget(node.target);
          }}
          onMouseLeave={() => onSetHoverHighlightTarget(null)}
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
              onClick={() => onToggleNode(node.id)}
            >
              <ChevronIcon className="h-3.5 w-3.5 text-gray-500" />
            </button>
          ) : (
            <span className="inline-block h-5 w-5 shrink-0" />
          )}

          <div
            role="button"
            tabIndex={0}
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

              onSetSelectedComponentId(null);
              onSetSelectedLayerIds(nextSelectedLayerIds);
              onSetLastSelectedLayerId(node.id);
              onSetSelectedLayerId(node.id);
              onSetActiveHighlightTarget(resolvedTarget ?? null);
              if (node.isTemplateComponent) {
                const componentItem = componentCatalog.find(
                  (item) => item.rootLayerId === node.id
                );
                if (componentItem) {
                  onSetSelectedComponentId(componentItem.id);
                  onSetDragFeedback({
                    tone: "info",
                    message: "컴포넌트 구조 편집은 Grid 편집 화면에서 진행해 주세요.",
                  });
                }
              }
              onSelectLayer?.({
                ...(resolvedTarget ? { target: resolvedTarget } : {}),
                sectionKey: node.sectionKey,
                layerId: node.id,
                editorMode: "instance",
              });
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              const resolvedTarget = node.target;
              onSetSelectedComponentId(null);
              onSetSelectedLayerIds([node.id]);
              onSetLastSelectedLayerId(node.id);
              onSetSelectedLayerId(node.id);
              onSetActiveHighlightTarget(resolvedTarget ?? null);
              if (node.isTemplateComponent) {
                const componentItem = componentCatalog.find(
                  (item) => item.rootLayerId === node.id
                );
                if (componentItem) {
                  onSetSelectedComponentId(componentItem.id);
                  onSetDragFeedback({
                    tone: "info",
                    message: "컴포넌트 구조 편집은 Grid 편집 화면에서 진행해 주세요.",
                  });
                }
              }
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
              <span className="shrink-0 rounded border border-[#3f6ad8] bg-[#1a2b57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b9ccff]">
                Component
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={`inline-flex h-5 shrink-0 items-center justify-center rounded border px-1 text-[10px] font-semibold uppercase tracking-wide transition ${
              isExtractableComponentInstance
                ? "border-[#3a4d72] bg-[#1a2538] text-[#9ec1ff] hover:border-[#4f8cff] hover:bg-[#203150]"
                : "hidden"
            }`}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (!isExtractableComponentInstance) return;
              onExtractComponentInstanceLayerCopy?.(node.id);
              onSetDragFeedback({
                tone: "info",
                message: "인스턴스를 루트 레이어로 복제했습니다.",
              });
            }}
            draggable={false}
            aria-label={`${node.label} 인스턴스 복제`}
            title="Extract Copy To Root"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            className={`inline-flex h-5 shrink-0 items-center justify-center rounded border px-1 text-[10px] font-semibold uppercase tracking-wide transition ${
              isExtractableComponentInstance
                ? "border-[#3a4d72] bg-[#1a2538] text-[#9ec1ff] hover:border-[#4f8cff] hover:bg-[#203150]"
                : "hidden"
            }`}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (!isExtractableComponentInstance) return;
              onMoveComponentInstanceLayerToRoot?.(node.id);
              onSetDragFeedback({
                tone: "info",
                message: "인스턴스를 루트 레이어로 이동했습니다.",
              });
            }}
            draggable={false}
            aria-label={`${node.label} 인스턴스 루트 이동`}
            title="Move To Root"
          >
            <ArrowUpRight className="h-3 w-3" />
          </button>
          <button
            type="button"
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2a2f3a] ${
              isSelfLocked ? "text-[#d9b25f]" : "text-[#7383a4]"
            }`}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLayerLocked(node.id);
              onSetDragFeedback({
                tone: "info",
                message: isSelfLocked
                  ? "레이어 잠금을 해제했습니다."
                  : "레이어를 잠갔습니다.",
              });
            }}
            draggable={false}
            aria-label={
              isSelfLocked ? `${node.label} 잠금 해제` : `${node.label} 잠금`
            }
            title={isSelfLocked ? "잠금 해제" : "잠금"}
          >
            <LockIcon className="h-3.5 w-3.5" />
          </button>
          {isVirtualNode ? (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#5d6473]">
              <VisibilityIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
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
                onToggleLayerHidden(node.id);
              }}
              draggable={false}
              aria-label={
                isLayerHidden(node.id) ? `${node.label} 보이기` : `${node.label} 숨기기`
              }
              title={isLayerHidden(node.id) ? "보이기" : "숨기기"}
            >
              <VisibilityIcon className="h-3.5 w-3.5" />
            </button>
          )}
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
    <div
      className="relative min-h-[220px] space-y-1 pb-[60px]"
      onContextMenu={openRootContextMenu}
    >
      {getOrderedChildren(v2_ROOT_LAYER_PARENT_ID, layerTree).map((node) =>
        renderNode(node, 0, v2_ROOT_LAYER_PARENT_ID, false)
      )}
      {typeof window !== "undefined" && contextMenuElement
        ? createPortal(contextMenuElement, document.body)
        : null}
    </div>
  );
};

export default V2LayersTree;
