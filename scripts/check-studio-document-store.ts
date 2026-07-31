/**
 * 문서 store의 기준선 가드.
 *
 * 편집기마다 store를 따로 만든다는 규칙과 `getState()`가 곧바로 최신 값을
 * 준다는 규칙을 고정한다. 앞의 것이 깨지면 한 페이지의 편집기 둘이 서로의
 * 문서를 덮어쓰고, 뒤의 것이 깨지면 한 동작 안에서 문서를 두 번 바꾸는 코드가
 * 오래된 값을 읽는다.
 */
import assert from "node:assert/strict";

import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { createStudioDocumentStore } from "../src/stores/studio/studio-document-store";

const createDocument = (name: string): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name },
    canvas: { width: 100, height: 100, background: "#fff" },
    graph: { rootNodeIds: [], nodes: {} },
    inputs: {},
    styles: {},
    assets: {},
  }) as unknown as StudioTemplateDocument;

const createRuntimeValues = (): StudioRuntimeValues =>
  ({ global: {}, entries: {} }) as unknown as StudioRuntimeValues;

// --- 편집기마다 다른 store ---

const first = createStudioDocumentStore({
  document: createDocument("first"),
  runtimeValues: createRuntimeValues(),
});
const second = createStudioDocumentStore({
  document: createDocument("second"),
  runtimeValues: createRuntimeValues(),
});

first.getState().setDocument(createDocument("first changed"));

assert.equal(
  first.getState().document.metadata.name,
  "first changed",
  "바꾼 문서가 그 편집기에 들어간다.",
);
assert.equal(
  second.getState().document.metadata.name,
  "second",
  "한 편집기의 변경이 다른 편집기로 새지 않는다.",
);

// --- getState는 곧바로 최신 값을 준다 ---
//
// 한 동작 안에서 문서를 여러 번 바꾸는 코드가 오래된 값을 읽으면 안 된다.

const store = createStudioDocumentStore({
  document: createDocument("a"),
  runtimeValues: createRuntimeValues(),
});

store.getState().setDocument(createDocument("b"));
assert.equal(
  store.getState().document.metadata.name,
  "b",
  "바꾼 즉시 읽을 수 있다.",
);

store
  .getState()
  .setDocument(
    createDocument(`${store.getState().document.metadata.name} then c`),
  );
assert.equal(
  store.getState().document.metadata.name,
  "b then c",
  "이어지는 변경이 직전 결과 위에 쌓인다.",
);

// --- 구독은 값이 바뀔 때만 ---

let documentNotifications = 0;
const unsubscribe = store.subscribe(() => {
  documentNotifications += 1;
});

store.getState().setDocument(createDocument("d"));
assert.equal(documentNotifications, 1, "문서를 바꾸면 구독자에게 알린다.");
unsubscribe();

store.getState().setDocument(createDocument("e"));
assert.equal(documentNotifications, 1, "구독을 끊은 뒤에는 알리지 않는다.");

// --- 런타임 값 갱신 ---

const runtimeStore = createStudioDocumentStore({
  document: createDocument("runtime"),
  runtimeValues: {
    global: { input_1: "one" },
    entries: {},
  } as unknown as StudioRuntimeValues,
});

runtimeStore
  .getState()
  .setRuntimeValues({
    global: { input_1: "two" },
    entries: {},
  } as unknown as StudioRuntimeValues);
assert.deepEqual(
  runtimeStore.getState().runtimeValues.global,
  { input_1: "two" },
  "값을 그대로 넣을 수 있다.",
);

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
  "runtime",
  "런타임 값을 바꿔도 문서는 그대로다.",
);

console.log("Studio document store baseline checks passed.");
