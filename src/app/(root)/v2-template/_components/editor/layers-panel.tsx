import React, { useEffect, useMemo, useState } from "react";

import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import { V2TemplateLayerNode } from "@/types/time-table/template-render-config";
import { v2_SCENE_STRUCTURE_MESSAGES } from "@/utils/time-table/template-scene-structure-messages";
import {
  V2DropPosition,
  V2LayerParentId,
  v2_createInitialOrderMap,
  v2_findNodeById,
  v2_isDescendantLayer,
  v2_ROOT_LAYER_PARENT_ID,
} from "./layers-dnd";
import V2LayersComponentsTab, {
  V2LayersComponentItem,
} from "./layers-components-tab";
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
  onDetachComponent?: (componentId: string) => void;
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
}

const V2TimeTableLayersPanel: React.FC<V2TimeTableLayersPanelProps> = ({
  layerTree: layerTreeProp,
  componentCatalog = [],
  componentLayerTreeByComponentId = {},
  onSelectLayer,
  orderedIdsByParent,
  onReorderLayers,
  canRelocateLayer,
  onRelocateLayers,
  onDetachComponent,
  onCreateComponent,
  onDuplicateComponent,
  onDeleteComponent,
  extractableComponentInstanceLayerIdSet,
  onExtractComponentInstanceLayerCopy,
  onMoveComponentInstanceLayerToRoot,
  onCreateSceneNodeFromLayerMenu,
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
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(true);
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
  const selectComponentMaster = (
    componentItem: (typeof componentCatalog)[number]
  ) => {
    const resolvedRootLayerId =
      componentItem.rootLayerId ??
      componentLayerTreeByComponentId[componentItem.id]?.id ??
      null;
    if (!resolvedRootLayerId) {
      setDragFeedback({
        tone: "error",
        message:
          "이 컴포넌트는 master layer를 찾을 수 없습니다. 구성 데이터를 확인해 주세요.",
      });
      return;
    }
    setSelectedComponentId(componentItem.id);
    setSelectedLayerIds([resolvedRootLayerId]);
    setLastSelectedLayerId(resolvedRootLayerId);
    setSelectedLayerId(resolvedRootLayerId);
    onSelectLayer?.({
      layerId: resolvedRootLayerId,
      editorMode: "master",
    });
  };
  const applyComponentMutationResult = (
    result: V2ComponentMutationResult | undefined
  ) => {
    if (!result) return;
    setDragFeedback({
      tone: result.tone,
      message: result.message,
    });
    if (result.selectedComponentId !== undefined) {
      setSelectedComponentId(result.selectedComponentId);
    }
    if (result.selectedLayerId === undefined) return;
    if (!result.selectedLayerId) {
      setSelectedLayerId(null);
      setSelectedLayerIds([]);
      return;
    }

    setSelectedLayerId(result.selectedLayerId);
    setSelectedLayerIds([result.selectedLayerId]);
    setLastSelectedLayerId(result.selectedLayerId);
    onSelectLayer?.({
      layerId: result.selectedLayerId,
      editorMode: "master",
    });
  };
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
            <h3 className="text-sm font-semibold text-gray-100">Structure</h3>
            {activeTab === "layers" ? (
              <button
                type="button"
                className="rounded border border-[#354056] bg-[#171e2b] px-1.5 py-0.5 text-[10px] font-semibold text-[#9db2d8] hover:bg-[#1f2838]"
                onClick={() => setIsShortcutHelpOpen((prev) => !prev)}
                aria-label="레이어 조작 도움말"
              >
                {isShortcutHelpOpen ? "도움말 숨김" : "도움말 보기"}
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("layers");
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
              onClick={() => {
                setActiveTab("components");
                const selectedComponent = componentCatalog.find(
                  (item) => item.id === selectedComponentId
                );
                if (selectedComponent) {
                  selectComponentMaster(selectedComponent);
                  return;
                }
                const firstComponent = componentCatalog.find(
                  (item) => item.rootLayerId !== null
                );
                if (firstComponent) {
                  selectComponentMaster(firstComponent);
                }
              }}
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
          className="flex-1 overflow-y-auto p-2 pb-[60px]"
          tabIndex={0}
          onKeyDown={handleLayersKeyDown}
        >
          {activeTab === "layers" && isShortcutHelpOpen ? (
            <div className="mb-2 rounded border border-[#2f394d] bg-[#151c28] px-2 py-1.5 text-[10px] text-[#8ca2c8]">
              다중 선택: `Cmd/Ctrl + 클릭` / 범위 선택: `Shift + 클릭` / 이동:
              `Alt + ↑/↓` / 그룹 이동: `Alt + Shift + ←/→` / 동일 부모 다중
              선택 드래그 지원
            </div>
          ) : null}
          {activeTab === "layers" ? (
            <div className="mb-2 rounded border border-[#3b5b8b] bg-[#14233d] px-2 py-1.5 text-[10px] text-[#9ec1ff]">
              Layers 탭은 인스턴스 편집 전용입니다. 마스터 편집은 Components 탭에서
              진행해 주세요.
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
              canRelocateLayer={canRelocateLayer}
              expanded={expanded}
              onToggleNode={toggleNode}
              onSetSelectedComponentId={setSelectedComponentId}
              onSetSelectedLayerIds={setSelectedLayerIds}
              onSetLastSelectedLayerId={setLastSelectedLayerId}
              onSetSelectedLayerId={setSelectedLayerId}
              onSetActiveHighlightTarget={setActiveHighlightTarget}
              onSetHoverHighlightTarget={setHoverHighlightTarget}
              onToggleLayerHidden={toggleLayerHidden}
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
          ) : (
            <V2LayersComponentsTab
              componentCatalog={componentCatalog}
              componentLayerTreeByComponentId={componentLayerTreeByComponentId}
              selectedComponentId={selectedComponentId}
              selectedLayerId={selectedLayerId}
              onCreateComponent={() => {
                applyComponentMutationResult(onCreateComponent?.());
              }}
              onSelectComponentMaster={selectComponentMaster}
              onSelectComponentLayer={({ componentItem, layerId }) => {
                setSelectedComponentId(componentItem.id);
                setSelectedLayerIds([layerId]);
                setLastSelectedLayerId(layerId);
                setSelectedLayerId(layerId);
                onSelectLayer?.({
                  layerId,
                  editorMode: "master",
                });
              }}
              onDetachComponent={(componentId) => {
                onDetachComponent?.(componentId);
              }}
              onDuplicateComponent={(componentId) => {
                applyComponentMutationResult(onDuplicateComponent?.(componentId));
              }}
              onDeleteComponent={(componentItem) => {
                if (!window.confirm(`${componentItem.label} 컴포넌트를 삭제할까요?`)) {
                  return;
                }
                applyComponentMutationResult(onDeleteComponent?.(componentItem.id));
              }}
              onJumpToFirstInstance={(componentItem) => {
                const firstInstanceLayerId = componentItem.firstInstanceLayerId;
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
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default V2TimeTableLayersPanel;
