/** 단축키가 가리키는 동작. */
export type StudioShortcutAction =
  | "undo"
  | "redo"
  | "saveDraft"
  | "selectAll"
  | "copy"
  | "cut"
  | "paste"
  | "duplicate"
  | "group"
  | "ungroup"
  | "toggleLock"
  | "moveLayerForward"
  | "moveLayerBackward"
  | "moveLayerFront"
  | "moveLayerBack"
  | "delete"
  | "cancelCut"
  | "closeNodePicker"
  | "clearSelection"
  | "nudge"
  | "zoomIn"
  | "zoomOut"
  | "zoomToFit"
  | "zoomReset";
export interface StudioShortcutKeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
}
export interface StudioShortcutContext {
  /** 글자를 입력하는 칸 안인지. 그 안에서는 편집기 단축키가 먹으면 안 된다. */
  isEditingTarget: boolean;
  /** 잘라내기 표시가 남아 있는지. Escape가 먼저 그것을 지운다. */
  hasCutNodes: boolean;
  /** 객체 고르기 창이 열려 있는지. Escape가 선택을 지우기 전에 창을 닫는다. */
  isNodePickerOpen: boolean;
}
export interface StudioShortcutResolution {
  action: StudioShortcutAction;
  /**
   * 눌린 채로 반복될 때도 다시 실행할지.
   *
   * 문서를 바꾸는 동작은 한 번만 실행한다. 되돌리기를 누른 채로 두면 이력이
   * 순식간에 끝까지 감기고, 붙여넣기는 같은 것이 수십 개 쌓인다. 화살표 이동,
   * 확대·축소, Escape는 여러 번 일어나도 자연스럽거나 결과가 같아서 허용한다.
   */
  allowRepeat: boolean;
  /** 화살표 이동에서 옮길 거리. */
  nudge?: { dx: number; dy: number };
}
/** 화살표 한 번에 옮기는 거리. Shift를 누르면 열 배로 간다. */
const STUDIO_NUDGE_STEP = 1;
const STUDIO_NUDGE_STEP_WITH_SHIFT = 10;
const NUDGE_DIRECTION: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};
/**
 * 누른 키가 어떤 동작을 가리키는지 정한다.
 *
 * 글자를 입력하는 칸 안에서는 아무 동작도 가리키지 않는다. 그러지 않으면 이름을
 * 고치다가 `d`를 눌러 객체가 복제되고, 지우려고 Backspace를 눌러 객체가 지워진다.
 *
 * 브라우저 기본 동작과 겹치는 키가 많다. 무엇이든 가리키는 키는 호출한 쪽이 기본
 * 동작을 막는다. 여기서는 무엇을 할지만 정한다.
 */
export const resolveStudioShortcut = (
  event: StudioShortcutKeyEvent,
  { isEditingTarget, hasCutNodes, isNodePickerOpen }: StudioShortcutContext,
): StudioShortcutResolution | null => {
  if (isEditingTarget) return null;
  const key = event.key.toLowerCase();
  const isModKey = event.metaKey || event.ctrlKey;
  // Escape는 겹쳐 있는 것을 안쪽부터 하나씩 걷어낸다. 한 번에 다 지우면 잘라내기
  // 표시를 지우려다 선택까지 잃는다.
  if (key === "escape") {
    // 여러 번 눌러도 결과가 같으므로 반복을 막지 않는다.
    if (hasCutNodes) return { action: "cancelCut", allowRepeat: true };
    if (isNodePickerOpen) {
      return { action: "closeNodePicker", allowRepeat: true };
    }
    return { action: "clearSelection", allowRepeat: true };
  }
  const isRedoShortcut =
    (isModKey && key === "z" && event.shiftKey) ||
    // 윈도우의 Ctrl+Y도 다시 실행이다. Cmd+Y는 브라우저가 쓰는 자리라 두지 않는다.
    (event.ctrlKey && !event.metaKey && key === "y");
  if (isRedoShortcut) return { action: "redo", allowRepeat: false };
  if (isModKey && key === "z" && !event.shiftKey) {
    return { action: "undo", allowRepeat: false };
  }
  if (isModKey && !event.altKey) {
    if (key === "s") return { action: "saveDraft", allowRepeat: false };
    if (key === "a") return { action: "selectAll", allowRepeat: false };
    if (key === "c") return { action: "copy", allowRepeat: false };
    if (key === "x") return { action: "cut", allowRepeat: false };
    if (key === "v") return { action: "paste", allowRepeat: false };
    if (key === "d") return { action: "duplicate", allowRepeat: false };
    if (key === "g") {
      return {
        action: event.shiftKey ? "ungroup" : "group",
        allowRepeat: false,
      };
    }
    if (key === "l" && event.shiftKey) {
      return { action: "toggleLock", allowRepeat: false };
    }
    if (event.key === "]") {
      return {
        action: event.shiftKey ? "moveLayerFront" : "moveLayerForward",
        allowRepeat: false,
      };
    }
    if (event.key === "[") {
      return {
        action: event.shiftKey ? "moveLayerBack" : "moveLayerBackward",
        allowRepeat: false,
      };
    }
  }
  if (event.key === "Backspace" || event.key === "Delete") {
    return { action: "delete", allowRepeat: false };
  }
  // 화살표는 함께 누른 조합키가 없을 때만 옮기기다. Cmd+화살표는 브라우저가 쓴다.
  if (!isModKey && !event.altKey && event.key.startsWith("Arrow")) {
    const direction = NUDGE_DIRECTION[event.key];
    if (!direction) return null;
    const step = event.shiftKey
      ? STUDIO_NUDGE_STEP_WITH_SHIFT
      : STUDIO_NUDGE_STEP;
    return {
      action: "nudge",
      allowRepeat: true,
      nudge: { dx: direction[0] * step, dy: direction[1] * step },
    };
  }
  if (!isModKey) return null;
  if (key === "=" || key === "+") {
    return { action: "zoomIn", allowRepeat: true };
  }
  if (key === "-") return { action: "zoomOut", allowRepeat: true };
  if (key === "0") return { action: "zoomToFit", allowRepeat: true };
  if (key === "1") return { action: "zoomReset", allowRepeat: true };
  return null;
};
