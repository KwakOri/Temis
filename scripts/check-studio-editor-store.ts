/**
 * 편집기 store의 기준선 가드.
 *
 * 되돌리기 한 단위가 store 상태의 일부와 같은 모양이라는 계약을 고정한다. 이
 * 계약이 깨지면 되돌린 뒤 문서와 화면이 어긋난다. 예를 들어 선택이 스냅샷에서
 * 빠지면 노드를 지운 뒤 되돌렸을 때 속성 패널이 다른 것을 보여준다.
 *
 * 편집기마다 store를 따로 만든다는 규칙도 함께 고정한다. 싱글톤이면 한 페이지의
 * 편집기 둘이 서로의 문서를 덮어쓴다.
 */
import assert from "node:assert/strict";

import {
  captureStudioEditorSnapshot,
  createStudioEditorStore,
  type StudioEditorSnapshot,
} from "../src/stores/studio/studio-editor-store";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";

const createDocument = (
  name: string,
  nodeIds: string[] = ["a", "b"],
): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name },
    canvas: { width: 100, height: 100, background: "#fff" },
    graph: {
      rootNodeIds: [...nodeIds],
      nodes: Object.fromEntries(
        nodeIds.map((nodeId) => [
          nodeId,
          {
            id: nodeId,
            type: "text",
            label: nodeId,
            parentId: null,
            childIds: [],
          },
        ]),
      ),
    },
    inputs: {},
    styles: {},
    assets: {},
  }) as unknown as StudioTemplateDocument;

const createRuntimeValues = (value = "one"): StudioRuntimeValues =>
  ({
    global: { input_1: value },
    entries: {},
  }) as unknown as StudioRuntimeValues;

const createStore = () =>
  createStudioEditorStore({
    document: createDocument("base"),
    runtimeValues: createRuntimeValues(),
    selectedNodeIds: ["a"],
  });

// --- 되돌리기 한 단위의 구성 ---
//
// 이 목록이 줄어들면 되돌린 뒤 화면이 문서와 어긋난다.

const SNAPSHOT_KEYS = [
  "document",
  "runtimeValues",
  "selectedNodeId",
  "selectedNodeIds",
  "selectedInputId",
  "selectedRuntimeDayId",
  "selectedRuntimeEntryIndex",
] as const;

const snapshot = captureStudioEditorSnapshot(createStore().getState());

assert.deepEqual(
  Object.keys(snapshot).sort(),
  [...SNAPSHOT_KEYS].sort(),
  "되돌리기 한 단위에 담기는 값이 바뀌면 안 된다.",
);

// 스냅샷의 모든 값은 store 상태에 같은 이름으로 있어야 한다.
// 그래서 복원이 store에 그대로 덮어쓰는 일이 된다.
const storeState = createStore().getState() as unknown as Record<
  string,
  unknown
>;
SNAPSHOT_KEYS.forEach((key) => {
  assert.ok(
    key in storeState,
    `store에 ${key}가 없다. 스냅샷과 store 모양이 어긋나면 복원이 값을 흘린다.`,
  );
});

// --- 스냅샷은 사본이다 ---
//
// 되돌리기가 지난 상태를 잡고 있으므로 이후 편집이 스냅샷을 건드리면 안 된다.

const mutationStore = createStore();
const takenSnapshot = captureStudioEditorSnapshot(mutationStore.getState());

mutationStore.getState().setDocument(createDocument("changed"));
assert.equal(
  takenSnapshot.document.metadata.name,
  "base",
  "이후 문서 변경이 이미 떠낸 스냅샷을 바꾸면 안 된다.",
);

mutationStore.getState().setSelection(["b"], "b");
assert.deepEqual(
  takenSnapshot.selectedNodeIds,
  ["a"],
  "이후 선택 변경이 이미 떠낸 스냅샷을 바꾸면 안 된다.",
);

const inPlaceStore = createStore();
const inPlaceSnapshot = captureStudioEditorSnapshot(inPlaceStore.getState());
inPlaceStore.getState().document.metadata.name = "mutated in place";
inPlaceStore.getState().selectedNodeIds.push("b");
assert.equal(
  inPlaceSnapshot.document.metadata.name,
  "base",
  "문서를 제자리에서 바꿔도 스냅샷은 그대로여야 한다.",
);
assert.deepEqual(
  inPlaceSnapshot.selectedNodeIds,
  ["a"],
  "선택 배열을 제자리에서 바꿔도 스냅샷은 그대로여야 한다.",
);

// --- 복원 ---

const restoreStore = createStore();
const restorePoint = captureStudioEditorSnapshot(restoreStore.getState());

restoreStore.getState().setDocument(createDocument("after", ["a", "b", "c"]));
restoreStore.getState().setSelection(["c"], "c");
restoreStore.getState().setSelectedInputId("input_9");
restoreStore.getState().setSelectedRuntimeDayId("fri");
restoreStore.getState().setSelectedRuntimeEntryIndex(3);
restoreStore.getState().setRuntimeValues(createRuntimeValues("two"));

restoreStore.getState().restoreSnapshot(restorePoint);

assert.equal(
  restoreStore.getState().document.metadata.name,
  "base",
  "문서를 되돌린다.",
);
assert.deepEqual(
  restoreStore.getState().selectedNodeIds,
  ["a"],
  "선택도 함께 되돌린다.",
);
assert.equal(restoreStore.getState().selectedNodeId, "a");
assert.equal(
  restoreStore.getState().selectedInputId,
  null,
  "고른 입력도 함께 되돌린다.",
);
assert.equal(
  restoreStore.getState().selectedRuntimeDayId,
  "mon",
  "미리보기 요일도 함께 되돌린다.",
);
assert.equal(
  restoreStore.getState().selectedRuntimeEntryIndex,
  0,
  "미리보기 일정 순번도 함께 되돌린다.",
);
assert.deepEqual(
  restoreStore.getState().runtimeValues.global,
  { input_1: "one" },
  "런타임 값도 함께 되돌린다.",
);

// 복원한 값도 사본이어야 한다. 같은 스냅샷으로 두 번 되돌릴 수 있어야 하기 때문이다.
restoreStore.getState().document.metadata.name = "touched";
restoreStore.getState().restoreSnapshot(restorePoint);
assert.equal(
  restoreStore.getState().document.metadata.name,
  "base",
  "같은 스냅샷으로 여러 번 되돌릴 수 있다.",
);

// 복원은 문서에 없는 노드도 그대로 되살린다. 방금 되살린 노드가 빠지면 안 된다.
const reviveStore = createStore();
reviveStore.getState().setDocument(createDocument("with c", ["a", "b", "c"]));
reviveStore.getState().setSelection(["c"], "c");
const revivePoint = captureStudioEditorSnapshot(reviveStore.getState());

reviveStore.getState().setDocument(createDocument("without c", ["a", "b"]));
reviveStore.getState().restoreSnapshot(revivePoint);
assert.deepEqual(
  reviveStore.getState().selectedNodeIds,
  ["c"],
  "복원은 선택을 걸러내지 않는다. 문서와 선택을 함께 갈아끼우기 때문이다.",
);

// --- 선택 정리 ---

const selectionStore = createStore();
selectionStore.getState().setSelection(["a", "gone", "b"], "b");
assert.deepEqual(
  selectionStore.getState().selectedNodeIds,
  ["a", "b"],
  "문서에 없는 노드는 선택에서 빠진다.",
);
assert.equal(selectionStore.getState().selectedNodeId, "b");

selectionStore.getState().setSelection(["a", "b"], "gone");
assert.equal(
  selectionStore.getState().selectedNodeId,
  "b",
  "기준 노드가 목록에 없으면 마지막 노드를 기준으로 삼는다.",
);

selectionStore.getState().replaceSelection(["gone"], "gone");
assert.deepEqual(
  selectionStore.getState().selectedNodeIds,
  ["gone"],
  "replaceSelection은 검사 없이 덮어쓴다.",
);

// --- 처음 상태 ---

const initialStore = createStudioEditorStore({
  document: createDocument("init"),
  runtimeValues: createRuntimeValues(),
  selectedNodeIds: ["a", "b"],
});
assert.equal(
  initialStore.getState().selectedNodeId,
  "b",
  "처음 고른 노드가 여럿이면 마지막을 기준으로 삼는다.",
);
assert.equal(initialStore.getState().selectedRuntimeDayId, "mon");
assert.equal(initialStore.getState().selectedRuntimeEntryIndex, 0);
assert.equal(initialStore.getState().selectedInputId, null);

const emptyStore = createStudioEditorStore({
  document: createDocument("init"),
  runtimeValues: createRuntimeValues(),
});
assert.deepEqual(emptyStore.getState().selectedNodeIds, []);
assert.equal(emptyStore.getState().selectedNodeId, null);

// --- 편집기마다 다른 store ---

const first = createStore();
const second = createStore();

first.getState().setDocument(createDocument("first changed"));
first.getState().setSelectedRuntimeDayId("sat");

assert.equal(second.getState().document.metadata.name, "base");
assert.equal(
  second.getState().selectedRuntimeDayId,
  "mon",
  "한 편집기의 변경이 다른 편집기로 새지 않는다.",
);

// --- getState는 곧바로 최신 값을 준다 ---

const sequentialStore = createStore();
sequentialStore.getState().setDocument(createDocument("one"));
sequentialStore
  .getState()
  .setDocument(
    createDocument(`${sequentialStore.getState().document.metadata.name} two`),
  );
assert.equal(
  sequentialStore.getState().document.metadata.name,
  "one two",
  "이어지는 변경이 직전 결과 위에 쌓인다.",
);

// --- 런타임 값 갱신 ---

const runtimeStore = createStore();
runtimeStore.getState().setRuntimeValues(createRuntimeValues("two"));
assert.deepEqual(runtimeStore.getState().runtimeValues.global, {
  input_1: "two",
});

runtimeStore.getState().setRuntimeValues((currentValues) => ({
  ...currentValues,
  global: { ...currentValues.global, input_2: "three" },
}));
assert.deepEqual(
  runtimeStore.getState().runtimeValues.global,
  { input_1: "two", input_2: "three" },
  "직전 값을 받아 바꾸는 형태도 쓸 수 있다.",
);
assert.equal(
  runtimeStore.getState().document.metadata.name,
  "base",
  "런타임 값을 바꿔도 문서는 그대로다.",
);

// --- 구독 ---

let notifications = 0;
const subscribeStore = createStore();
const unsubscribe = subscribeStore.subscribe(() => {
  notifications += 1;
});

subscribeStore.getState().setDocument(createDocument("notify"));
assert.equal(notifications, 1, "상태를 바꾸면 구독자에게 알린다.");
unsubscribe();

subscribeStore.getState().setDocument(createDocument("silent"));
assert.equal(notifications, 1, "구독을 끊은 뒤에는 알리지 않는다.");

// 타입만 확인한다. 스냅샷 타입이 store 상태에 그대로 들어가야 한다.
const typedSnapshot: StudioEditorSnapshot = snapshot;
assert.ok(typedSnapshot);

console.log("Studio editor store baseline checks passed.");
