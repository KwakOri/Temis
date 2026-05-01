import React, { useEffect, useMemo, useState } from "react";

import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import { V2TemplateLayerNode } from "@/types/time-table/template-render-config";
import { v2_SCENE_STRUCTURE_MESSAGES } from "@/utils/v2/template-scene-structure-messages";
import {
  V2DropPosition,
  V2LayerParentId,
  v2_createInitialOrderMap,
  v2_findNodeById,
  v2_isDescendantLayer,
  v2_ROOT_LAYER_PARENT_ID,
} from "./layers-dnd";
import type { V2LayersComponentItem } from "./layers-components-tab";
import V2LayersTree from "./layers-tree";

type V2LayerNode = V2TemplateLayerNode;
type V2ComponentMutationResult = {
  ok: boolean;
  tone: "info" | "error";
  message: string;
  selectedComponentId?: string | null;
  selectedLayerId?: string | null;
};

interface V2TimeTableLayersPanelProps {
  layerTree?: V2LayerNode[];
  componentCatalog?: V2LayersComponentItem[];
  componentLayerTreeByComponentId?: Record<string, V2LayerNode | null>;
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
  onCreateComponent?: () => V2ComponentMutationResult;
  onDuplicateComponent?: (componentId: string) => V2ComponentMutationResult;
  onDeleteComponent?: (componentId: string) => V2ComponentMutationResult;
  extractableComponentInstanceLayerIdSet?: Set<string>;
  onExtractComponentInstanceLayerCopy?: (layerId: string) => void;
  onMoveComponentInstanceLayerToRoot?: (layerId: string) => void;
  onCreateSceneNodeFromLayerMenu?: (payload: {
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
    layerId?: string | null;
  }) => void;
  scopeTitle?: string;
  scopeDescription?: string;
  onExitScope?: () => void;
  exitScopeLabel?: string;
}

const V2TimeTableLayersPanel: React.FC<V2TimeTableLayersPanelProps> = ({
  layerTree: layerTreeProp,
  componentCatalog = [],
  onSelectLayer,
  orderedIdsByParent,
  onReorderLayers,
  canRelocateLayer,
  onRelocateLayers,
  extractableComponentInstanceLayerIdSet,
  onExtractComponentInstanceLayerCopy,
  onMoveComponentInstanceLayerToRoot,
  onCreateSceneNodeFromLayerMenu,
  scopeTitle,
  scopeDescription,
  onExitScope,
  exitScopeLabel = "Scene으로",
}) => {
  const {
    activeHighlightTarget,
    setActiveHighlightTarget,
    setHoverHighlightTarget,
    isLayerHidden,
    toggleLayerHidden,
    isLayerLocked,
    toggleLayerLocked,
  } = useTemplateRuntimeContext();
  const layerTree = useMemo(() => {
    return layerTreeProp ?? [];
  }, [layerTreeProp]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "scene-root": true,
    grid: true,
    artist: true,
    memo: true,
    profile: true,
    card: true,
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [lastSelectedLayerId, setLastSelectedLayerId] = useState<string | null>(
    null
  );
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(true);
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
    draggedNodeIds: string[];
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

    const visit = (node: V2LayerNode) => {
      const selfMatched = node.target !== undefined && node.target === activeTarget;
      if (selfMatched) {
        ids.add(node.id);
      }
      (node.children ?? []).forEach((child) => {
        visit(child);
      });
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

    if (selectedInOrder.some((id) => isLayerLocked(id))) {
      setDragFeedback({
        tone: "error",
        message: "잠긴 레이어는 순서를 변경할 수 없습니다.",
      });
      return;
    }

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
      const selectedIds =
        selectedLayerIds.length > 0 ? selectedLayerIds : [selectedLayerId];

      const sourceParentCandidates = new Set<string>();
      Object.entries(orderedNodeIdsByParent).forEach(([parentId, ids]) => {
        if (selectedIds.some((id) => ids.includes(id))) {
          sourceParentCandidates.add(parentId);
        }
      });

      if (sourceParentCandidates.size !== 1) {
        setDragFeedback({
          tone: "error",
          message: "키보드 그룹 이동은 같은 부모의 레이어에서만 지원됩니다.",
        });
        return;
      }

      const sourceParentId = Array.from(sourceParentCandidates)[0];
      const sourceSiblingIds = orderedNodeIdsByParent[sourceParentId] ?? [];
      const selectedInOrder = sourceSiblingIds.filter((id) =>
        selectedIds.includes(id)
      );
      if (selectedInOrder.length === 0) return;

      if (selectedInOrder.some((id) => isLayerLocked(id))) {
        setDragFeedback({
          tone: "error",
          message: "잠긴 레이어는 이동할 수 없습니다.",
        });
        return;
      }

      if (
        sourceParentId !== v2_ROOT_LAYER_PARENT_ID &&
        selectedInOrder.some((id) => !canRelocateLayer?.(id))
      ) {
        setDragFeedback({
          tone: "error",
          message: "선택한 레이어 중 그룹 이동이 잠긴 항목이 있습니다.",
        });
        return;
      }

      if (direction === "left") {
        if (sourceParentId === v2_ROOT_LAYER_PARENT_ID) return;

        const targetParentEntry = Object.entries(orderedNodeIdsByParent).find(
          ([, ids]) => ids.includes(sourceParentId)
        );
        const targetParentId = targetParentEntry?.[0] ?? v2_ROOT_LAYER_PARENT_ID;
        const targetSiblingIds = orderedNodeIdsByParent[targetParentId] ?? [];
        const sourceParentIndex = targetSiblingIds.indexOf(sourceParentId);
        if (sourceParentIndex < 0) return;
        const targetIndex = sourceParentIndex + 1;

        setOrderedNodeIdsByParent((prev) => {
          const selectedSet = new Set(selectedInOrder);
          const nextSourceIds = (prev[sourceParentId] ?? []).filter(
            (id) => !selectedSet.has(id)
          );
          const nextTargetIds = [...(prev[targetParentId] ?? [])];
          nextTargetIds.splice(targetIndex, 0, ...selectedInOrder);
          return {
            ...prev,
            [sourceParentId]: nextSourceIds,
            [targetParentId]: nextTargetIds,
          };
        });
        selectedInOrder.forEach((id, index) => {
          onRelocateLayers?.({
            layerId: id,
            sourceParentId,
            targetParentId,
            targetIndex: targetIndex + index,
          });
        });
        setDragFeedback({
          tone: "info",
          message:
            selectedInOrder.length > 1
              ? `${selectedInOrder.length}개 레이어를 한 단계 바깥 그룹으로 이동했습니다.`
              : "레이어를 한 단계 바깥 그룹으로 이동했습니다.",
        });
        return;
      }

      const firstSelectedId = selectedInOrder[0];
      const firstSelectedIndex = sourceSiblingIds.indexOf(firstSelectedId);
      if (firstSelectedIndex <= 0) return;

      const prevSiblingId = sourceSiblingIds[firstSelectedIndex - 1];
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
      if (
        selectedInOrder.some((id) =>
          v2_isDescendantLayer({
            nodes: layerTree,
            ancestorId: id,
            targetId: targetParentId,
          })
        )
      ) {
        setDragFeedback({
          tone: "error",
          message: v2_SCENE_STRUCTURE_MESSAGES.DESCENDANT_BLOCKED,
        });
        return;
      }

      const targetIndex = (orderedNodeIdsByParent[targetParentId] ?? []).length;

      setOrderedNodeIdsByParent((prev) => {
        const selectedSet = new Set(selectedInOrder);
        const nextSourceIds = (prev[sourceParentId] ?? []).filter(
          (id) => !selectedSet.has(id)
        );
        const nextTargetIds = [...(prev[targetParentId] ?? [])];
        nextTargetIds.splice(targetIndex, 0, ...selectedInOrder);
        return {
          ...prev,
          [sourceParentId]: nextSourceIds,
          [targetParentId]: nextTargetIds,
        };
      });
      selectedInOrder.forEach((id, index) => {
        onRelocateLayers?.({
          layerId: id,
          sourceParentId,
          targetParentId,
          targetIndex: targetIndex + index,
        });
      });
      setDragFeedback({
        tone: "info",
        message:
          selectedInOrder.length > 1
            ? `${selectedInOrder.length}개 레이어를 이전 그룹 하위로 이동했습니다.`
            : "레이어를 이전 그룹 하위로 이동했습니다.",
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

  return (
    <div className="v2-dark-form-theme h-full min-h-0 w-full border-r border-[#303848] bg-[#121722]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-[#303848] px-3 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-100">
                {scopeTitle ?? "Structure"}
              </h3>
              {scopeDescription ? (
                <p className="mt-0.5 truncate text-[10px] text-[#8ca2c8]">
                  {scopeDescription}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {onExitScope ? (
                <button
                  type="button"
                  className="rounded border border-[#4f8cff] bg-[#1f3f75] px-2 py-1 text-[10px] font-semibold text-[#dbe8ff] hover:bg-[#294c86]"
                  onClick={onExitScope}
                >
                  {exitScopeLabel}
                </button>
              ) : null}
              <button
                type="button"
                className="rounded border border-[#354056] bg-[#171e2b] px-1.5 py-0.5 text-[10px] font-semibold text-[#9db2d8] hover:bg-[#1f2838]"
                onClick={() => setIsShortcutHelpOpen((prev) => !prev)}
                aria-label="레이어 조작 도움말"
              >
                {isShortcutHelpOpen ? "도움말 숨김" : "도움말 보기"}
              </button>
            </div>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto p-2 pb-[60px]"
          tabIndex={0}
          onKeyDown={handleLayersKeyDown}
        >
          {isShortcutHelpOpen ? (
            <div className="mb-2 rounded border border-[#2f394d] bg-[#151c28] px-2 py-1.5 text-[10px] text-[#8ca2c8]">
              다중 선택: `Cmd/Ctrl + 클릭` / 범위 선택: `Shift + 클릭` / 이동:
              `Alt + ↑/↓` / 그룹 이동: `Alt + Shift + ←/→` / 동일 부모 다중
              선택 드래그 지원
            </div>
          ) : null}
          {scopeDescription ? (
            <div className="mb-2 rounded border border-[#3b5b8b] bg-[#14233d] px-2 py-1.5 text-[10px] text-[#9ec1ff]">
              {scopeDescription}
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
          <V2LayersTree
            layerTree={layerTree}
            componentCatalog={componentCatalog}
            selectedNodeIds={selectedNodeIds}
            selectedLayerIds={selectedLayerIds}
            lastSelectedLayerId={lastSelectedLayerId}
            orderedNodeIdsByParent={orderedNodeIdsByParent}
            dragState={dragState}
            dropState={dropState}
            extractableComponentInstanceLayerIdSet={
              extractableComponentInstanceLayerIdSet
            }
            isLayerHidden={isLayerHidden}
            isLayerLocked={isLayerLocked}
            canRelocateLayer={canRelocateLayer}
            expanded={expanded}
            onToggleNode={toggleNode}
            onSetSelectedComponentId={() => undefined}
            onSetSelectedLayerIds={setSelectedLayerIds}
            onSetLastSelectedLayerId={setLastSelectedLayerId}
            onSetSelectedLayerId={setSelectedLayerId}
            onSetActiveHighlightTarget={setActiveHighlightTarget}
            onSetHoverHighlightTarget={setHoverHighlightTarget}
            onToggleLayerHidden={toggleLayerHidden}
            onToggleLayerLocked={toggleLayerLocked}
            onSetDragState={(nextState) => setDragState(nextState)}
            onSetDropState={(nextState) => setDropState(nextState)}
            onSetDragFeedback={(feedback) => setDragFeedback(feedback)}
            onCommitLayerOrder={commitLayerOrder}
            onRelocateLayers={onRelocateLayers}
            onSelectLayer={onSelectLayer}
            onExtractComponentInstanceLayerCopy={
              onExtractComponentInstanceLayerCopy
            }
            onMoveComponentInstanceLayerToRoot={
              onMoveComponentInstanceLayerToRoot
            }
            onCreateSceneNodeFromLayerMenu={onCreateSceneNodeFromLayerMenu}
          />
        </div>
      </div>
    </div>
  );
};

export default V2TimeTableLayersPanel;
