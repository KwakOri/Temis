/**
 * 편집기 단축키의 기준선 가드.
 *
 * 글자를 입력하는 칸 안에서는 어떤 단축키도 먹지 않아야 한다. 먹으면 이름을
 * 고치다가 `d`로 객체가 복제되고, 글자를 지우려고 Backspace를 눌러 객체가 지워진다.
 *
 * 문서를 바꾸는 동작은 눌린 채로 반복될 때 다시 실행하지 않는다. 되돌리기를 누른
 * 채로 두면 이력이 순식간에 끝까지 감기고, 붙여넣기는 같은 것이 수십 개 쌓인다.
 *
 * Escape는 겹쳐 있는 것을 안쪽부터 걷어낸다. 한 번에 다 지우면 잘라내기 표시를
 * 지우려다 선택까지 잃는다.
 */
import assert from "node:assert/strict";
import {
  resolveStudioShortcut,
  type StudioShortcutContext,
  type StudioShortcutKeyEvent,
} from "../src/utils/template-studio/keyboard-shortcuts";
const IDLE: StudioShortcutContext = {
  isEditingTarget: false,
  hasCutNodes: false,
  isNodePickerOpen: false,
};
const press = (
  key: string,
  modifiers: Partial<StudioShortcutKeyEvent> = {},
  context: Partial<StudioShortcutContext> = {},
) =>
  resolveStudioShortcut(
    {
      key,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
      ...modifiers,
    },
    { ...IDLE, ...context },
  );
const actionOf = (
  key: string,
  modifiers: Partial<StudioShortcutKeyEvent> = {},
  context: Partial<StudioShortcutContext> = {},
) => press(key, modifiers, context)?.action ?? null;
const MOD = { metaKey: true } as const;
// --- 글자 입력 중에는 아무것도 하지 않는다 ---
for (const [key, modifiers] of [
  ["d", MOD],
  ["Backspace", {}],
  ["ArrowLeft", {}],
  ["Escape", {}],
  ["z", MOD],
  ["a", MOD],
] as const) {
  assert.equal(
    actionOf(key, modifiers, { isEditingTarget: true }),
    null,
    `글자를 입력하는 칸에서는 ${key}가 편집기 동작이 되면 안 된다.`,
  );
}
// --- 키와 동작의 짝 ---
assert.deepEqual(
  [
    actionOf("z", MOD),
    actionOf("z", { ...MOD, shiftKey: true }),
    actionOf("y", { ctrlKey: true }),
    actionOf("y", MOD),
  ],
  ["undo", "redo", "redo", null],
  "되돌리기와 다시 실행. 윈도우의 Ctrl+Y도 다시 실행이고, Cmd+Y는 브라우저 자리라 쓰지 않는다.",
);
assert.deepEqual(
  [
    actionOf("s", MOD),
    actionOf("a", MOD),
    actionOf("c", MOD),
    actionOf("x", MOD),
    actionOf("v", MOD),
    actionOf("d", MOD),
  ],
  ["saveDraft", "selectAll", "copy", "cut", "paste", "duplicate"],
  "저장과 선택, 복사·잘라내기·붙여넣기·복제는 자리를 바꾸지 않는다.",
);
assert.deepEqual(
  [actionOf("g", MOD), actionOf("g", { ...MOD, shiftKey: true })],
  ["group", "ungroup"],
  "묶기와 풀기는 Shift로 갈린다.",
);
assert.deepEqual(
  [actionOf("l", { ...MOD, shiftKey: true }), actionOf("l", MOD)],
  ["toggleLock", null],
  "잠금은 Shift를 함께 눌러야 한다. Cmd+L만으로는 브라우저 주소창이 열린다.",
);
assert.deepEqual(
  [
    actionOf("]", MOD),
    actionOf("]", { ...MOD, shiftKey: true }),
    actionOf("[", MOD),
    actionOf("[", { ...MOD, shiftKey: true }),
  ],
  ["moveLayerForward", "moveLayerFront", "moveLayerBackward", "moveLayerBack"],
  "레이어 순서는 한 칸씩 옮기고, Shift를 누르면 끝까지 간다.",
);
assert.deepEqual(
  [actionOf("Backspace"), actionOf("Delete")],
  ["delete", "delete"],
  "지우기는 두 키 모두 받는다. 자판에 따라 하나만 있다.",
);
assert.deepEqual(
  [
    actionOf("=", MOD),
    actionOf("+", MOD),
    actionOf("-", MOD),
    actionOf("0", MOD),
    actionOf("1", MOD),
  ],
  ["zoomIn", "zoomIn", "zoomOut", "zoomToFit", "zoomReset"],
  "확대·축소와 화면 맞추기, 실제 크기.",
);
assert.deepEqual(
  [actionOf("="), actionOf("0"), actionOf("s"), actionOf("g")],
  [null, null, null, null],
  "조합키 없이 누른 글자와 숫자는 편집기 동작이 아니다. 그냥 눌린 것을 동작으로 받으면 안 된다.",
);
assert.deepEqual(
  [
    actionOf("d", { metaKey: true, altKey: true }),
    actionOf("g", { metaKey: true, altKey: true }),
  ],
  [null, null],
  "Alt를 함께 누른 것은 다른 조합이다.",
);
// --- 화살표로 옮기기 ---
assert.deepEqual(
  [
    press("ArrowUp")?.nudge,
    press("ArrowDown")?.nudge,
    press("ArrowLeft")?.nudge,
    press("ArrowRight")?.nudge,
  ],
  [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ],
  "화살표는 한 번에 1px 옮긴다. 위로가 음수인 것은 화면 좌표가 아래로 자라기 때문이다.",
);
assert.deepEqual(
  press("ArrowRight", { shiftKey: true })?.nudge,
  { dx: 10, dy: 0 },
  "Shift를 누르면 열 배로 옮긴다.",
);
assert.equal(
  actionOf("ArrowRight", MOD),
  null,
  "Cmd+화살표는 브라우저가 쓰는 자리다.",
);
assert.equal(
  actionOf("ArrowRight", { altKey: true }),
  null,
  "Alt+화살표도 옮기기가 아니다.",
);
// --- Escape는 안쪽부터 걷어낸다 ---
assert.equal(
  actionOf("Escape", {}, { hasCutNodes: true, isNodePickerOpen: true }),
  "cancelCut",
  "잘라내기 표시가 남아 있으면 그것을 먼저 지운다.",
);
assert.equal(
  actionOf("Escape", {}, { isNodePickerOpen: true }),
  "closeNodePicker",
  "고르기 창이 열려 있으면 창을 닫는다. 선택까지 잃으면 다시 고를 것을 잃는다.",
);
assert.equal(
  actionOf("Escape"),
  "clearSelection",
  "걷어낼 것이 없으면 선택을 지운다.",
);
// --- 눌린 채로 반복될 때 ---
const repeatable = ["ArrowUp", "=", "-", "0", "1", "Escape"];
for (const key of repeatable) {
  const modifiers = key === "ArrowUp" || key === "Escape" ? {} : MOD;
  assert.equal(
    press(key, modifiers)?.allowRepeat,
    true,
    `${key}는 눌린 채로 두어도 자연스럽거나 결과가 같다.`,
  );
}
for (const [key, modifiers] of [
  ["z", MOD],
  ["v", MOD],
  ["d", MOD],
  ["g", MOD],
  ["s", MOD],
  ["Backspace", {}],
  ["]", MOD],
] as const) {
  assert.equal(
    press(key, modifiers)?.allowRepeat,
    false,
    `${key}는 눌린 채로 두어도 한 번만 실행해야 한다. 문서가 바뀌는 동작이다.`,
  );
}
// 반복 여부와 무엇을 가리키는지는 별개다. 반복 판단은 호출한 쪽이 한다.
assert.equal(
  actionOf("v", { ...MOD, repeat: true }),
  "paste",
  "반복 중에도 무엇을 가리키는지는 같다. 기본 동작을 막으려면 알아야 한다.",
);
console.log("Studio keyboard shortcut baseline checks passed.");
