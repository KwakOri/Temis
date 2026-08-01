"use client";

import { useCallback, useMemo } from "react";

import type {
  StudioGraphNodeType,
  StudioImageFit,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  applyStudioNodePositions,
  planStudioAlignNodes,
  planStudioDistributeNodes,
  type StudioAlignAxis,
  type StudioAlignment,
} from "@/utils/template-studio/align-commands";
import type { StudioCanvasPoint } from "@/utils/template-studio/canvas-viewport-geometry";
import {
  applyStudioDuplicateNodes,
  applyStudioGroupNodes,
  applyStudioLayerMove,
  applyStudioToggleNodeHidden,
  applyStudioToggleNodeLock,
  applyStudioUngroupNodes,
  getStudioLayerMoveMessage,
  getStudioNodeVisibilityMessage,
  planStudioDuplicateNodes,
  planStudioGroupNodes,
  planStudioLayerMove,
  planStudioToggleNodeHidden,
  planStudioToggleNodeLock,
  planStudioUngroupNodes,
  type StudioLayerMoveCommand,
} from "@/utils/template-studio/graph-commands";
import { getStudioTopLevelNodeIds } from "@/utils/template-studio/graph-nodes";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import { createStudioId } from "@/utils/template-studio/id";
import { getStudioCanvasNodeDragBlockedReason } from "@/utils/template-studio/layer-drag";
import {
  applyStudioDeleteNodes,
  planStudioDeleteNodes,
} from "@/utils/template-studio/node-commands";
import {
  applyStudioNodeFitParent,
  applyStudioNodeOffset,
  applyStudioNodeStyleValue,
  applyStudioNodeTextAlignment,
  planStudioNudgeNodes,
  resolveStudioDragTargetNodeIds,
  type StudioTextAlignment,
} from "@/utils/template-studio/node-style-commands";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";
import {
  normalizeStudioCanvasSize,
  normalizeStudioRotationDeg,
  type StudioResizeGeometry,
} from "@/utils/template-studio/transform-commands";
import {
  createStudioThumbnailNode,
  planStudioNodeInsertion,
} from "@/utils/thumbnail-studio/node-defaults";

/** 되돌리기 한 단위를 이 변경이 시작하는지. 끌고 있는 중이면 시작하지 않는다. */
export interface ThumbnailUpdateOptions {
  history?: boolean;
}

export interface ThumbnailNodeCommandsOptions {
  /** 콜백 안에서 최신 문서를 읽는다. */
  getDocument: () => StudioTemplateDocument;
  getSelectedNodeIds: () => string[];
  getSelectedNodeId: () => string | null;
  /** 지금 보고 있는 캔버스 좌표의 중앙. 뷰포트만 아는 값이다. */
  getViewportCenter: () => StudioCanvasPoint | null;
  updateDocument: (
    mutate: (draft: StudioTemplateDocument) => void,
    options?: ThumbnailUpdateOptions,
  ) => void;
  /** 되돌리기 한 단위를 시작한다. 끌기와 연속 조작이 직접 부른다. */
  captureHistory: () => void;
  applySelection: (nodeIds: string[], primaryNodeId?: string | null) => void;
  selectSingleNode: (nodeId: string | null) => void;
  onStatusMessage: (message: string) => void;
}

export interface ThumbnailNodeCommands {
  addNode: (type: StudioGraphNodeType) => void;
  deleteNodes: () => void;
  duplicateNodes: () => void;
  groupNodes: () => void;
  ungroupNodes: () => void;
  moveLayer: (command: StudioLayerMoveCommand) => void;
  toggleLock: () => void;
  toggleHidden: () => void;
  renameNode: (nodeId: string, label: string) => void;
  nudgeNodes: (deltaX: number, deltaY: number) => void;
  /** 캔버스에서 끌기를 시작할 수 있는지. 막히면 이유를 알리고 false를 준다. */
  beginNodeMove: (nodeId: string) => boolean;
  moveNodeByDrag: (
    nodeId: string,
    delta: { deltaX: number; deltaY: number },
  ) => void;
  setStyleValue: (
    nodeId: string,
    key: string,
    value: string | number | undefined,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setGeometry: (
    nodeId: string,
    geometry: Partial<StudioResizeGeometry>,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setRotation: (
    nodeId: string,
    rotateDeg: number,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setTextAlignment: (nodeId: string, textAlign: StudioTextAlignment) => void;
  toggleFitParent: (nodeId: string) => void;
  setImageFit: (nodeId: string, fit: StudioImageFit) => void;
  setStaticText: (nodeId: string, value: string) => void;
  setImageAsset: (nodeId: string, assetId: string | null) => void;
  alignNodes: (axis: StudioAlignAxis, alignment: StudioAlignment) => void;
  distributeNodes: (axis: StudioAlignAxis) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setCanvasBackground: (
    background: string,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setCanvasName: (name: string) => void;
  selectAll: () => void;
}

/**
 * 썸네일 편집기의 문서 명령.
 *
 * 무엇을 바꿀 수 있는지는 공통 순수 함수가 판단하고, 이 훅은 그 계획을 문서에 적고
 * 선택과 안내를 맞추는 배선만 한다. 시간표에서 쓰는 명령을 그대로 쓰는 것이 규칙이다.
 * 같은 일을 하는 함수를 썸네일에 새로 쓰면 두 편집기의 규칙이 갈라진다.
 */
export function useThumbnailNodeCommands({
  getDocument,
  getSelectedNodeIds,
  getSelectedNodeId,
  getViewportCenter,
  updateDocument,
  captureHistory,
  applySelection,
  selectSingleNode,
  onStatusMessage,
}: ThumbnailNodeCommandsOptions): ThumbnailNodeCommands {
  const addNode = useCallback(
    (type: StudioGraphNodeType) => {
      const document = getDocument();
      const selectedNodeId = getSelectedNodeId();
      const selectedNode = selectedNodeId
        ? document.graph.nodes[selectedNodeId]
        : null;
      const plan = planStudioNodeInsertion({
        document,
        type,
        selectedNode,
        viewportCenter: getViewportCenter(),
      });
      const nodeId = createStudioId("node");
      const styleId = createStudioId("style");
      const { node, style } = createStudioThumbnailNode({
        nodeId,
        styleId,
        type,
        label: `New ${getStudioGraphNodeTypeLabel(type)}`,
        plan,
      });

      updateDocument((draft) => {
        draft.styles[styleId] = style;
        draft.graph.nodes[nodeId] = node;

        // 형제 목록의 끝이 가장 앞에 그려진다. 새로 넣은 것은 보여야 한다.
        const siblings = plan.parentId
          ? draft.graph.nodes[plan.parentId]?.childIds
          : draft.graph.rootNodeIds;
        siblings?.push(nodeId);
      });
      selectSingleNode(nodeId);
      onStatusMessage(`Added ${getStudioGraphNodeTypeLabel(type)}`);
    },
    [
      getDocument,
      getSelectedNodeId,
      getViewportCenter,
      onStatusMessage,
      selectSingleNode,
      updateDocument,
    ],
  );

  const deleteNodes = useCallback(() => {
    const plan = planStudioDeleteNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioDeleteNodes(draft, plan.nodeIds));
    selectSingleNode(plan.fallbackSelectionId);
    onStatusMessage(`Deleted ${plan.nodeIds.length} object(s)`);
  }, [
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    selectSingleNode,
    updateDocument,
  ]);

  const duplicateNodes = useCallback(() => {
    const plan = planStudioDuplicateNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    const duplicated: { nodeIds: string[] } = { nodeIds: [] };
    updateDocument((draft) => {
      duplicated.nodeIds = applyStudioDuplicateNodes(draft, plan);
    });

    if (duplicated.nodeIds.length === 0) {
      onStatusMessage("Duplicate failed");
      return;
    }

    applySelection(duplicated.nodeIds, duplicated.nodeIds.at(-1) ?? null);
    onStatusMessage(`Duplicated ${duplicated.nodeIds.length} object(s)`);
  }, [
    applySelection,
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    updateDocument,
  ]);

  const groupNodes = useCallback(() => {
    const plan = planStudioGroupNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioGroupNodes(draft, plan));
    selectSingleNode(plan.groupNodeId);
    onStatusMessage(`Grouped ${plan.orderedNodeIds.length} objects`);
  }, [
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    selectSingleNode,
    updateDocument,
  ]);

  const ungroupNodes = useCallback(() => {
    const plan = planStudioUngroupNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    const released: { nodeIds: string[] } = { nodeIds: [] };
    updateDocument((draft) => {
      released.nodeIds = applyStudioUngroupNodes(draft, plan.groupNodeIds);
    });

    applySelection(released.nodeIds, released.nodeIds.at(-1) ?? null);
    onStatusMessage(`Ungrouped ${plan.groupNodeIds.length} group(s)`);
  }, [
    applySelection,
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    updateDocument,
  ]);

  const moveLayer = useCallback(
    (command: StudioLayerMoveCommand) => {
      const plan = planStudioLayerMove(
        getDocument(),
        getSelectedNodeId(),
        command,
      );
      if (!plan.ok) {
        onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) => applyStudioLayerMove(draft, plan));
      onStatusMessage(getStudioLayerMoveMessage(command));
    },
    [getDocument, getSelectedNodeId, onStatusMessage, updateDocument],
  );

  const toggleLock = useCallback(() => {
    const plan = planStudioToggleNodeLock(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioToggleNodeLock(draft, plan));
    onStatusMessage(plan.nextLocked ? "Locked" : "Unlocked");
  }, [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument]);

  const toggleHidden = useCallback(() => {
    const plan = planStudioToggleNodeHidden(
      getDocument(),
      getSelectedNodeIds(),
    );
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioToggleNodeHidden(draft, plan));
    onStatusMessage(getStudioNodeVisibilityMessage(plan.nextHidden));
  }, [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument]);

  const renameNode = useCallback(
    (nodeId: string, label: string) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (node) node.label = label;
      });
    },
    [updateDocument],
  );

  const nudgeNodes = useCallback(
    (deltaX: number, deltaY: number) => {
      const plan = planStudioNudgeNodes(getDocument(), getSelectedNodeIds());
      if (!plan.ok) {
        if (plan.reason) onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) =>
        applyStudioNodeOffset(draft, plan.nodeIds, { deltaX, deltaY }),
      );
    },
    [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument],
  );

  const beginNodeMove = useCallback(
    (nodeId: string) => {
      const document = getDocument();
      const targetNodeIds = resolveStudioDragTargetNodeIds(
        document,
        getSelectedNodeIds(),
        nodeId,
      );
      const blockedReason = getStudioCanvasNodeDragBlockedReason(
        document,
        targetNodeIds,
      );

      if (blockedReason) {
        onStatusMessage(blockedReason);
        return false;
      }

      // 한 번의 끌기가 되돌리기 한 단위다. 여기서 시작하고 끌고 있는 동안은 쌓지 않는다.
      captureHistory();
      return true;
    },
    [captureHistory, getDocument, getSelectedNodeIds, onStatusMessage],
  );

  const moveNodeByDrag = useCallback(
    (nodeId: string, delta: { deltaX: number; deltaY: number }) => {
      const targetNodeIds = resolveStudioDragTargetNodeIds(
        getDocument(),
        getSelectedNodeIds(),
        nodeId,
      );

      updateDocument(
        (draft) =>
          applyStudioNodeOffset(draft, targetNodeIds, delta, {
            round: true,
            skipFillParent: true,
          }),
        { history: false },
      );
    },
    [getDocument, getSelectedNodeIds, updateDocument],
  );

  const setStyleValue = useCallback(
    (
      nodeId: string,
      key: string,
      value: string | number | undefined,
      options?: ThumbnailUpdateOptions,
    ) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;
        applyStudioNodeStyleValue(draft, node, key, value);
      }, options);
    },
    [updateDocument],
  );

  const setGeometry = useCallback(
    (
      nodeId: string,
      geometry: Partial<StudioResizeGeometry>,
      options?: ThumbnailUpdateOptions,
    ) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;

        Object.entries(geometry).forEach(([key, value]) => {
          if (typeof value !== "number" || !Number.isFinite(value)) return;
          applyStudioNodeStyleValue(draft, node, key, Number(value.toFixed(2)));
        });
      }, options);
    },
    [updateDocument],
  );

  const setRotation = useCallback(
    (nodeId: string, rotateDeg: number, options?: ThumbnailUpdateOptions) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;
        applyStudioNodeStyleValue(
          draft,
          node,
          "rotateDeg",
          normalizeStudioRotationDeg(rotateDeg),
        );
      }, options);
    },
    [updateDocument],
  );

  const setTextAlignment = useCallback(
    (nodeId: string, textAlign: StudioTextAlignment) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;
        applyStudioNodeTextAlignment(draft, node, textAlign);
      });
    },
    [updateDocument],
  );

  const toggleFitParent = useCallback(
    (nodeId: string) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      if (!node) return;

      const shouldFillParent = node.layoutMode !== "fillParent";
      const geometry = resolveStudioGraphNodeGeometry(document, nodeId);

      updateDocument((draft) => {
        const draftNode = draft.graph.nodes[nodeId];
        if (!draftNode) return;
        applyStudioNodeFitParent(draft, draftNode, shouldFillParent, geometry);
      });
    },
    [getDocument, updateDocument],
  );

  const setImageFit = useCallback(
    (nodeId: string, fit: StudioImageFit) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (node) node.fit = fit;
      });
    },
    [updateDocument],
  );

  const setStaticText = useCallback(
    (nodeId: string, value: string) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;
        node.binding = { kind: "staticText", value };
      });
    },
    [updateDocument],
  );

  const setImageAsset = useCallback(
    (nodeId: string, assetId: string | null) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;
        node.binding = assetId ? { kind: "staticAsset", assetId } : undefined;
      });
    },
    [updateDocument],
  );

  const alignNodes = useCallback(
    (axis: StudioAlignAxis, alignment: StudioAlignment) => {
      const plan = planStudioAlignNodes(
        getDocument(),
        getSelectedNodeIds(),
        axis,
        alignment,
      );
      if (!plan.ok) {
        onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) =>
        applyStudioNodePositions(draft, plan.positions),
      );
      onStatusMessage(`Aligned ${plan.positions.length} object(s)`);
    },
    [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument],
  );

  const distributeNodes = useCallback(
    (axis: StudioAlignAxis) => {
      const plan = planStudioDistributeNodes(
        getDocument(),
        getSelectedNodeIds(),
        axis,
      );
      if (!plan.ok) {
        onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) =>
        applyStudioNodePositions(draft, plan.positions),
      );
      onStatusMessage(`Distributed ${plan.positions.length} objects`);
    },
    [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument],
  );

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      // 노드 좌표는 그대로 둔다. 캔버스 밖으로 나간 노드도 지우지 않는다. 지우면
      // 되돌릴 수 없는 손실이 된다.
      const normalized = normalizeStudioCanvasSize(size);
      updateDocument((draft) => {
        draft.canvas.width = normalized.width;
        draft.canvas.height = normalized.height;
      });
    },
    [updateDocument],
  );

  const setCanvasBackground = useCallback(
    (background: string, options?: ThumbnailUpdateOptions) => {
      updateDocument((draft) => {
        draft.canvas.background = background;
      }, options);
    },
    [updateDocument],
  );

  const setCanvasName = useCallback(
    (name: string) => {
      updateDocument((draft) => {
        draft.metadata.name = name;
      });
    },
    [updateDocument],
  );

  const selectAll = useCallback(() => {
    const document = getDocument();
    const nodeIds = getStudioTopLevelNodeIds(
      document,
      document.graph.rootNodeIds,
    );
    if (nodeIds.length === 0) {
      onStatusMessage("Nothing to select");
      return;
    }

    applySelection(nodeIds, nodeIds.at(-1) ?? null);
    onStatusMessage(`Selected ${nodeIds.length} object(s)`);
  }, [applySelection, getDocument, onStatusMessage]);

  return useMemo(
    () => ({
      addNode,
      deleteNodes,
      duplicateNodes,
      groupNodes,
      ungroupNodes,
      moveLayer,
      toggleLock,
      toggleHidden,
      renameNode,
      nudgeNodes,
      beginNodeMove,
      moveNodeByDrag,
      setStyleValue,
      setGeometry,
      setRotation,
      setTextAlignment,
      toggleFitParent,
      setImageFit,
      setStaticText,
      setImageAsset,
      alignNodes,
      distributeNodes,
      setCanvasSize,
      setCanvasBackground,
      setCanvasName,
      selectAll,
    }),
    [
      addNode,
      alignNodes,
      beginNodeMove,
      deleteNodes,
      distributeNodes,
      duplicateNodes,
      groupNodes,
      moveLayer,
      moveNodeByDrag,
      nudgeNodes,
      renameNode,
      selectAll,
      setCanvasBackground,
      setCanvasName,
      setCanvasSize,
      setGeometry,
      setImageAsset,
      setImageFit,
      setRotation,
      setStaticText,
      setStyleValue,
      setTextAlignment,
      toggleFitParent,
      toggleHidden,
      toggleLock,
      ungroupNodes,
    ],
  );
}
