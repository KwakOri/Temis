"use client";
import { useEffect } from "react";
import {
  resolveStudioShortcut,
  type StudioShortcutAction,
} from "@/utils/template-studio/keyboard-shortcuts";
export interface StudioKeyboardShortcutHandlers {
  undo: () => void;
  redo: () => void;
  saveDraft: () => void;
  selectAll: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  group: () => void;
  ungroup: () => void;
  toggleLock: () => void;
  moveLayer: (direction: "forward" | "backward" | "front" | "back") => void;
  delete: () => void;
  /** 잘라내기 표시를 지운다. 지울 것이 있었는지 돌려준다. */
  cancelCut: () => boolean;
  closeNodePicker: () => void;
  clearSelection: () => void;
  nudge: (dx: number, dy: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomReset: () => void;
  onStatusMessage: (message: string) => void;
}
export interface StudioKeyboardShortcutOptions {
  /** 잘라내기 표시가 남아 있는지. Escape가 먼저 그것을 지운다. */
  hasCutNodes: boolean;
  isNodePickerOpen: boolean;
  handlers: StudioKeyboardShortcutHandlers;
}
/** 글자를 입력하는 칸 안인지. 그 안에서는 편집기 단축키가 먹으면 안 된다. */
const isEditingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
/**
 * 편집기 단축키.
 *
 * 어떤 키가 어떤 동작인지는 순수 함수가 정한다. 이 훅은 창에 귀를 달고, 정해진
 * 동작을 부르고, 브라우저 기본 동작을 막는 일만 한다.
 *
 * 무엇이든 가리키는 키는 기본 동작을 막는다. Cmd+S로 브라우저 저장 창이 열리거나
 * Cmd+D로 즐겨찾기가 추가되면 편집이 끊긴다.
 */
export function useStudioKeyboardShortcuts({
  hasCutNodes,
  isNodePickerOpen,
  handlers,
}: StudioKeyboardShortcutOptions): void {
  useEffect(() => {
    const runAction = (
      action: StudioShortcutAction,
      nudge?: { dx: number; dy: number },
    ) => {
      switch (action) {
        case "undo":
          handlers.undo();
          return;
        case "redo":
          handlers.redo();
          return;
        case "saveDraft":
          handlers.saveDraft();
          return;
        case "selectAll":
          handlers.selectAll();
          return;
        case "copy":
          handlers.copy();
          return;
        case "cut":
          handlers.cut();
          return;
        case "paste":
          handlers.paste();
          return;
        case "duplicate":
          handlers.duplicate();
          return;
        case "group":
          handlers.group();
          return;
        case "ungroup":
          handlers.ungroup();
          return;
        case "toggleLock":
          handlers.toggleLock();
          return;
        case "moveLayerForward":
          handlers.moveLayer("forward");
          return;
        case "moveLayerBackward":
          handlers.moveLayer("backward");
          return;
        case "moveLayerFront":
          handlers.moveLayer("front");
          return;
        case "moveLayerBack":
          handlers.moveLayer("back");
          return;
        case "delete":
          handlers.delete();
          return;
        case "cancelCut":
          if (handlers.cancelCut()) handlers.onStatusMessage("Cut canceled");
          return;
        case "closeNodePicker":
          handlers.closeNodePicker();
          return;
        case "clearSelection":
          handlers.clearSelection();
          return;
        case "nudge":
          if (nudge) handlers.nudge(nudge.dx, nudge.dy);
          return;
        case "zoomIn":
          handlers.zoomIn();
          return;
        case "zoomOut":
          handlers.zoomOut();
          return;
        case "zoomToFit":
          handlers.zoomToFit();
          return;
        case "zoomReset":
          handlers.zoomReset();
          return;
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const resolution = resolveStudioShortcut(event, {
        isEditingTarget: isEditingTarget(event.target),
        hasCutNodes,
        isNodePickerOpen,
      });
      if (!resolution) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat && !resolution.allowRepeat) return;
      runAction(resolution.action, resolution.nudge);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers, hasCutNodes, isNodePickerOpen]);
}
