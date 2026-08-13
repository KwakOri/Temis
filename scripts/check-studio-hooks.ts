/**
 * Studio 공통 선택과 이력 규칙의 기준선 가드.
 *
 * 선택과 이력은 마크업이 아니라 동작이다. 이 저장소에는 DOM 테스트 환경이
 * 없으므로 훅의 판단 로직을 순수 함수로 두고 그 계약을 검증한다. 훅은 이
 * 함수들을 감싸고 React 상태만 들고 있다.
 */
import assert from "node:assert/strict";

import {
  captureStudioHistory,
  createStudioHistoryStacks,
  redoStudioHistory,
  STUDIO_HISTORY_DEFAULT_LIMIT,
  undoStudioHistory,
} from "../src/utils/template-studio/history-stacks";
import {
  getStudioSelectionLabel,
  resolveStudioSelection,
  resolveStudioSelectionRange,
} from "../src/utils/template-studio/selection";

// --- 선택 정리 기준선 ---

const existingNodeIds = ["root", "a", "b", "c"];
const hasNode = (nodeId: string) => existingNodeIds.includes(nodeId);

assert.deepEqual(
  resolveStudioSelection(["a"], "a", hasNode),
  { nodeIds: ["a"], primaryNodeId: "a" },
  "단일 선택은 그대로 유지된다.",
);
assert.deepEqual(
  resolveStudioSelection(["a", "ghost", "b"], "b", hasNode),
  { nodeIds: ["a", "b"], primaryNodeId: "b" },
  "지워진 노드는 선택에서 빠진다.",
);
assert.deepEqual(
  resolveStudioSelection(["a", "a", "b"], "a", hasNode),
  { nodeIds: ["a", "b"], primaryNodeId: "a" },
  "중복 선택은 한 번만 남는다.",
);
assert.deepEqual(
  resolveStudioSelection(["a", "b"], "ghost", hasNode),
  { nodeIds: ["a", "b"], primaryNodeId: "b" },
  "기준 노드가 목록에 없으면 마지막 노드를 기준으로 삼는다.",
);
assert.deepEqual(
  resolveStudioSelection(["a", "b"], null, hasNode),
  { nodeIds: ["a", "b"], primaryNodeId: "b" },
  "기준 노드를 넘기지 않으면 마지막 노드를 기준으로 삼는다.",
);
assert.deepEqual(
  resolveStudioSelection([], null, hasNode),
  { nodeIds: [], primaryNodeId: null },
  "빈 선택은 기준 노드도 없다.",
);
assert.deepEqual(
  resolveStudioSelection(["ghost"], "ghost", hasNode),
  { nodeIds: [], primaryNodeId: null },
  "사라진 노드만 넘기면 선택이 비워진다.",
);

// --- 범위 선택 기준선 ---
//
// 레이어 패널은 앞에 있는 형제를 위에 보여준다. 범위 선택은 그 화면 순서를
// 따라야 한다.

const orderedNodeIds = ["root", "c", "b", "a"];

assert.deepEqual(
  resolveStudioSelectionRange({
    anchorNodeId: "c",
    append: false,
    currentNodeIds: ["c"],
    fallbackNodeId: null,
    orderedNodeIds,
    targetNodeId: "a",
  }),
  { nodeIds: ["c", "b", "a"], anchorNodeId: "c", rangeCount: 3 },
  "범위 선택은 anchor부터 대상까지 화면 순서로 고른다.",
);
assert.deepEqual(
  resolveStudioSelectionRange({
    anchorNodeId: "a",
    append: false,
    currentNodeIds: ["a"],
    fallbackNodeId: null,
    orderedNodeIds,
    targetNodeId: "c",
  }),
  { nodeIds: ["c", "b", "a"], anchorNodeId: "a", rangeCount: 3 },
  "위로 끌어도 화면 순서대로 담는다.",
);
assert.deepEqual(
  resolveStudioSelectionRange({
    anchorNodeId: "root",
    append: true,
    currentNodeIds: ["x"],
    fallbackNodeId: null,
    orderedNodeIds,
    targetNodeId: "root",
  }),
  { nodeIds: ["x", "root"], anchorNodeId: "root", rangeCount: 1 },
  "append 범위 선택은 기존 선택을 유지한다.",
);
assert.deepEqual(
  resolveStudioSelectionRange({
    anchorNodeId: null,
    append: false,
    currentNodeIds: [],
    fallbackNodeId: "b",
    orderedNodeIds,
    targetNodeId: "a",
  }),
  { nodeIds: ["b", "a"], anchorNodeId: "b", rangeCount: 2 },
  "anchor가 없으면 현재 선택을 기준으로 삼는다.",
);
assert.deepEqual(
  resolveStudioSelectionRange({
    anchorNodeId: "gone",
    append: false,
    currentNodeIds: [],
    fallbackNodeId: "gone-too",
    orderedNodeIds,
    targetNodeId: "b",
  }),
  { nodeIds: ["b"], anchorNodeId: "b", rangeCount: 1 },
  "anchor와 대체 노드가 모두 사라지면 대상만 선택한다.",
);
assert.deepEqual(
  resolveStudioSelectionRange({
    anchorNodeId: "a",
    append: false,
    currentNodeIds: [],
    fallbackNodeId: null,
    orderedNodeIds,
    targetNodeId: "hidden",
  }),
  { nodeIds: ["hidden"], anchorNodeId: "hidden", rangeCount: 0 },
  "대상이 화면에 없으면 범위를 만들지 않는다.",
);

assert.equal(getStudioSelectionLabel(1), "object");
assert.equal(getStudioSelectionLabel(2), "objects");
assert.equal(getStudioSelectionLabel(0), "objects");

// --- 이력 기준선 ---

assert.equal(
  STUDIO_HISTORY_DEFAULT_LIMIT,
  80,
  "이력 상한이 바뀌면 편집 되돌리기 범위가 달라진다.",
);

let stacks = createStudioHistoryStacks<string>();
assert.equal(
  undoStudioHistory(stacks, "v0"),
  null,
  "쌓인 이력이 없으면 되돌릴 수 없다.",
);
assert.equal(
  redoStudioHistory(stacks, "v0"),
  null,
  "다시 실행할 이력이 없으면 진행하지 않는다.",
);

stacks = captureStudioHistory(stacks, "v0");
stacks = captureStudioHistory(stacks, "v1");
assert.deepEqual(stacks, { past: ["v0", "v1"], future: [] });

const firstUndo = undoStudioHistory(stacks, "v2");
assert.ok(firstUndo, "쌓인 이력이 있으면 되돌린다.");
assert.equal(firstUndo.snapshot, "v1", "가장 최근 상태로 되돌린다.");
assert.deepEqual(firstUndo.stacks, { past: ["v0"], future: ["v2"] });

const secondUndo = undoStudioHistory(firstUndo.stacks, "v1");
assert.ok(secondUndo);
assert.equal(secondUndo.snapshot, "v0");
assert.deepEqual(secondUndo.stacks, { past: [], future: ["v1", "v2"] });
assert.equal(
  undoStudioHistory(secondUndo.stacks, "v0"),
  null,
  "처음 상태에서는 더 되돌릴 수 없다.",
);

const firstRedo = redoStudioHistory(secondUndo.stacks, "v0");
assert.ok(firstRedo, "되돌린 상태는 다시 실행할 수 있다.");
assert.equal(firstRedo.snapshot, "v1");
assert.deepEqual(firstRedo.stacks, { past: ["v0"], future: ["v2"] });

// 새 편집은 다시 실행 이력을 버린다.
assert.deepEqual(
  captureStudioHistory(firstRedo.stacks, "v1"),
  { past: ["v0", "v1"], future: [] },
  "새 편집 후에는 다시 실행할 이력이 남지 않는다.",
);

// 상한을 넘으면 오래된 이력이 밀려난다.
let limited = createStudioHistoryStacks<string>();
for (const value of ["s0", "s1", "s2"]) {
  limited = captureStudioHistory(limited, value, 2);
}
assert.deepEqual(
  limited,
  { past: ["s1", "s2"], future: [] },
  "상한을 넘은 오래된 이력은 버린다.",
);

const limitedUndo = undoStudioHistory(limited, "s3", 2);
assert.ok(limitedUndo);
assert.equal(limitedUndo.snapshot, "s2");
const limitedUndo2 = undoStudioHistory(limitedUndo.stacks, "s2", 2);
assert.ok(limitedUndo2);
assert.equal(limitedUndo2.snapshot, "s1");
assert.equal(
  undoStudioHistory(limitedUndo2.stacks, "s1", 2),
  null,
  "상한만큼만 되돌릴 수 있다.",
);
assert.deepEqual(
  limitedUndo2.stacks.future,
  ["s2", "s3"],
  "되돌린 상태는 상한 안에서 다시 실행 목록에 쌓인다.",
);

// 이력 값이 undefined일 수 있는 snapshot 타입도 다룬다.
const nullableStacks = captureStudioHistory(
  createStudioHistoryStacks<string | null>(),
  null,
);
const nullableUndo = undoStudioHistory<string | null>(nullableStacks, "next");
assert.ok(nullableUndo, "null snapshot도 되돌릴 수 있어야 한다.");
assert.equal(nullableUndo.snapshot, null);

console.log("Studio selection and history baseline checks passed.");
