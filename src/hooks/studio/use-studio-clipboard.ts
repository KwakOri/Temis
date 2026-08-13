"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  applyStudioPasteCopy,
  applyStudioPasteCut,
  isStudioPasteCopyReady,
  planStudioCopyNodes,
  planStudioCutNodes,
  planStudioPasteCut,
} from "@/utils/template-studio/clipboard-commands";
import type { StudioNodeClipboardPayload } from "@/utils/template-studio/node-clipboard";
import { getStudioSelectionLabel } from "@/utils/template-studio/selection";

export interface StudioClipboardOptions {
  /** 콜백 안에서 최신 문서를 읽는다. */
  getDocument: () => StudioTemplateDocument;
  getSelectedNodeIds: () => string[];
  getSelectedNodeId: () => string | null;
  /** 문서를 바꾼다. 이력은 이 함수가 소유한다. */
  updateDocument: (mutate: (draft: StudioTemplateDocument) => void) => void;
  /** 붙여넣은 노드를 고른다. */
  onSelect: (nodeIds: string[], primaryNodeId: string | null) => void;
  onStatusMessage: (message: string) => void;
  /** 붙여넣기가 끝난 뒤. 보통 레이어 탭으로 옮긴다. */
  onAfterPaste?: () => void;
}

export interface StudioClipboard {
  /** 잘라내기 표시할 노드. 레이어 패널이 흐리게 보여준다. */
  cutNodeIds: string[];
  copy: () => void;
  cut: () => void;
  paste: () => void;
  /**
   * 잘라내기 대기를 취소한다.
   *
   * 취소할 잘라내기가 있었으면 `true`를 준다. 복사한 내용은 건드리지 않는다.
   */
  cancelCut: () => boolean;
}

/**
 * 노드 복사·잘라내기·붙여넣기.
 *
 * 클립보드 내용과 잘라내기 표시를 소유한다. 무엇을 옮길 수 있는지와 어디에
 * 넣을지는 순수 함수가 판단하고, 이 훅은 상태와 안내만 다룬다.
 */
export function useStudioClipboard({
  getDocument,
  getSelectedNodeIds,
  getSelectedNodeId,
  updateDocument,
  onSelect,
  onStatusMessage,
  onAfterPaste,
}: StudioClipboardOptions): StudioClipboard {
  const [cutNodeIds, setCutNodeIds] = useState<string[]>([]);
  const payloadRef = useRef<StudioNodeClipboardPayload | null>(null);
  const optionsRef = useRef({
    getDocument,
    getSelectedNodeIds,
    getSelectedNodeId,
    updateDocument,
    onSelect,
    onStatusMessage,
    onAfterPaste,
  });

  useEffect(() => {
    optionsRef.current = {
      getDocument,
      getSelectedNodeIds,
      getSelectedNodeId,
      updateDocument,
      onSelect,
      onStatusMessage,
      onAfterPaste,
    };
  }, [
    getDocument,
    getSelectedNodeId,
    getSelectedNodeIds,
    onAfterPaste,
    onSelect,
    onStatusMessage,
    updateDocument,
  ]);

  const copy = useCallback(() => {
    const { getDocument: readDocument, getSelectedNodeIds: readSelection } =
      optionsRef.current;
    const plan = planStudioCopyNodes(readDocument(), readSelection());

    if (!plan.ok) {
      optionsRef.current.onStatusMessage(plan.reason);
      return;
    }

    payloadRef.current = plan.payload;
    setCutNodeIds([]);
    optionsRef.current.onStatusMessage(
      `Copied ${plan.payload.rootNodeIds.length} ${getStudioSelectionLabel(
        plan.payload.rootNodeIds.length,
      )}`,
    );
  }, []);

  const cut = useCallback(() => {
    const plan = planStudioCutNodes(
      optionsRef.current.getDocument(),
      optionsRef.current.getSelectedNodeIds(),
      optionsRef.current.getSelectedNodeId(),
    );

    if (!plan.ok) {
      optionsRef.current.onStatusMessage(plan.reason);
      return;
    }

    payloadRef.current = plan.payload;
    setCutNodeIds(plan.payload.rootNodeIds);
    optionsRef.current.onStatusMessage(
      `Cut ${plan.payload.rootNodeIds.length} ${getStudioSelectionLabel(
        plan.payload.rootNodeIds.length,
      )}`,
    );
  }, []);

  const pasteCut = useCallback(
    (payload: Extract<StudioNodeClipboardPayload, { kind: "cut" }>) => {
      const options = optionsRef.current;
      const plan = planStudioPasteCut(
        options.getDocument(),
        payload,
        options.getSelectedNodeId(),
      );

      if (!plan.ok) {
        if (plan.clearClipboard) {
          payloadRef.current = null;
          setCutNodeIds([]);
        }
        options.onStatusMessage(plan.reason);
        return;
      }

      const moved: { sourceNodeIds: string[]; ok: boolean; reason?: string } = {
        sourceNodeIds: [],
        ok: false,
      };
      options.updateDocument((draft) => {
        const result = applyStudioPasteCut(draft, plan);
        moved.ok = result.ok;
        moved.reason = result.reason ?? undefined;
        moved.sourceNodeIds = result.sourceNodeIds;
      });

      if (!moved.ok) {
        options.onStatusMessage(moved.reason ?? "Paste move failed");
        return;
      }

      payloadRef.current = null;
      setCutNodeIds([]);
      options.onSelect(
        moved.sourceNodeIds,
        moved.sourceNodeIds.includes(payload.primaryNodeId ?? "")
          ? payload.primaryNodeId
          : (moved.sourceNodeIds.at(-1) ?? null),
      );
      options.onAfterPaste?.();
      options.onStatusMessage(
        `Moved ${moved.sourceNodeIds.length} ${getStudioSelectionLabel(
          moved.sourceNodeIds.length,
        )}`,
      );
    },
    [],
  );

  const paste = useCallback(() => {
    const payload = payloadRef.current;
    const options = optionsRef.current;

    if (!payload) {
      options.onStatusMessage("Nothing to paste");
      return;
    }

    if (payload.kind === "cut") {
      pasteCut(payload);
      return;
    }

    if (!isStudioPasteCopyReady(payload)) {
      options.onStatusMessage("Paste failed");
      return;
    }

    const selectedNodeId = options.getSelectedNodeId();
    const selectedNode: StudioGraphNode | null = selectedNodeId
      ? (options.getDocument().graph.nodes[selectedNodeId] ?? null)
      : null;
    const pasted: { rootIds: string[] } = { rootIds: [] };

    options.updateDocument((draft) => {
      pasted.rootIds = applyStudioPasteCopy(draft, payload, selectedNode);
    });

    if (pasted.rootIds.length === 0) return;

    options.onSelect(pasted.rootIds, pasted.rootIds.at(-1) ?? null);
    options.onAfterPaste?.();
    options.onStatusMessage(
      `Pasted ${pasted.rootIds.length} ${getStudioSelectionLabel(
        pasted.rootIds.length,
      )}`,
    );
  }, [pasteCut]);

  const cancelCut = useCallback(() => {
    if (payloadRef.current?.kind !== "cut") return false;

    payloadRef.current = null;
    setCutNodeIds([]);
    return true;
  }, []);

  return { cutNodeIds, copy, cut, paste, cancelCut };
}
