/**
 * 입력 명령의 기준선 가드.
 *
 * select 옵션 값은 런타임 값과 노드의 옵션별 에셋 지도에서 키로 쓰인다. 옵션을
 * 바꾸거나 지울 때 그 키를 함께 옮기지 않으면 조용히 연결이 끊어지므로 그
 * 규칙을 고정한다.
 */
import assert from "node:assert/strict";

import type {
  StudioTemplateDocument,
  StudioTimetableComposition,
} from "../src/types/template-studio";
import {
  applyStudioAddSelectOption,
  applyStudioRemoveSelectOption,
  applyStudioSelectOptionValue,
  collectStudioInputConsumers,
  createStudioInputDefinition,
  formatStudioSlotName,
  getStudioInputTypeLabel,
} from "../src/utils/template-studio/input-commands";

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 100, height: 100, background: "#fff" },
    graph: {
      rootNodeIds: ["image"],
      nodes: {
        image: {
          id: "image",
          type: "image",
          label: "Sticker",
          parentId: null,
          childIds: [],
          binding: {
            kind: "selectAsset",
            inputId: "input_1",
            assetByOption: { a: "asset_a", b: null },
          },
        },
      },
    },
    inputs: {
      input_1: {
        id: "input_1",
        type: "select",
        scope: "entry",
        label: "Pick",
        defaultValue: "a",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
    },
    styles: {},
    assets: {},
  }) as unknown as StudioTemplateDocument;

// --- 표시 이름 ---

assert.equal(getStudioInputTypeLabel("text"), "Text");
assert.equal(getStudioInputTypeLabel("image"), "Image");
assert.equal(getStudioInputTypeLabel("select"), "Select");

assert.equal(
  formatStudioSlotName("backgroundAsset"),
  "Background Asset",
  "낙타 표기를 낱말로 나눈다.",
);
assert.equal(
  formatStudioSlotName("profile_frame"),
  "Profile Frame",
  "밑줄도 낱말 구분으로 본다.",
);

// --- 새 입력 ---

const textInput = createStudioInputDefinition("text", "global");
assert.equal(textInput.type, "text");
assert.equal(textInput.scope, "global");
assert.equal(textInput.label, "New Text Input");
assert.equal(
  textInput.type === "text" ? textInput.maxLength : null,
  48,
  "텍스트 입력 기본 길이 제한이 바뀌면 안 된다.",
);

const selectInput = createStudioInputDefinition("select", "entry");
assert.equal(selectInput.type, "select");
assert.deepEqual(
  selectInput.type === "select" ? selectInput.options.map((o) => o.value) : [],
  ["option-a", "option-b"],
  "select 입력은 옵션 두 개로 시작한다.",
);
assert.equal(
  selectInput.type === "select" ? selectInput.defaultValue : null,
  "option-a",
);

assert.notEqual(
  createStudioInputDefinition("text", "global").id,
  createStudioInputDefinition("text", "global").id,
  "입력마다 새 id를 받는다.",
);

// --- 옵션 값 변경 ---

const renameDocument = createDocument();
const renamed = applyStudioSelectOptionValue(
  renameDocument,
  "input_1",
  0,
  "alpha",
);
assert.deepEqual(renamed, { previousValue: "a" }, "이전 값을 알려준다.");

const renamedInput = renameDocument.inputs.input_1;
assert.deepEqual(
  renamedInput.type === "select" ? renamedInput.options : [],
  [
    { value: "alpha", label: "A" },
    { value: "b", label: "B" },
  ],
  "라벨은 그대로 두고 값만 바꾼다.",
);
assert.equal(
  renamedInput.type === "select" ? renamedInput.defaultValue : null,
  "alpha",
  "기본값이 바뀐 옵션이면 함께 옮긴다.",
);
assert.deepEqual(
  renameDocument.graph.nodes.image.binding?.kind === "selectAsset"
    ? renameDocument.graph.nodes.image.binding.assetByOption
    : null,
  { alpha: "asset_a", b: null },
  "옵션별 에셋 지도의 키도 함께 옮긴다.",
);

assert.equal(
  applyStudioSelectOptionValue(createDocument(), "missing", 0, "x"),
  null,
  "없는 입력은 바꾸지 않는다.",
);
assert.equal(
  applyStudioSelectOptionValue(createDocument(), "input_1", 9, "x"),
  null,
  "없는 옵션은 바꾸지 않는다.",
);

// 기본값이 아닌 옵션을 바꾸면 기본값은 그대로다.
const keepDefaultDocument = createDocument();
applyStudioSelectOptionValue(keepDefaultDocument, "input_1", 1, "beta");
const keptInput = keepDefaultDocument.inputs.input_1;
assert.equal(
  keptInput.type === "select" ? keptInput.defaultValue : null,
  "a",
  "기본값이 아닌 옵션을 바꿔도 기본값은 유지된다.",
);

// --- 옵션 추가 ---

const addDocument = createDocument();
const added = applyStudioAddSelectOption(addDocument, "input_1");
assert.deepEqual(
  added,
  { label: "Option 3", value: "option-3" },
  "옵션 번호는 현재 개수 다음으로 붙는다.",
);
assert.deepEqual(
  addDocument.graph.nodes.image.binding?.kind === "selectAsset"
    ? Object.keys(addDocument.graph.nodes.image.binding.assetByOption)
    : [],
  ["a", "b", "option-3"],
  "새 옵션의 에셋 자리를 만든다.",
);
assert.equal(
  applyStudioAddSelectOption(createDocument(), "missing"),
  null,
  "없는 입력에는 옵션을 더하지 않는다.",
);

// --- 옵션 삭제 ---

const removeDocument = createDocument();
const removed = applyStudioRemoveSelectOption(removeDocument, "input_1", 0);
assert.deepEqual(
  removed,
  { removedValue: "a", nextDefaultValue: "b" },
  "지운 값이 기본값이었으면 남은 첫 옵션으로 옮긴다.",
);
const removedInput = removeDocument.inputs.input_1;
assert.deepEqual(
  removedInput.type === "select"
    ? removedInput.options.map((o) => o.value)
    : [],
  ["b"],
);
assert.deepEqual(
  removeDocument.graph.nodes.image.binding?.kind === "selectAsset"
    ? Object.keys(removeDocument.graph.nodes.image.binding.assetByOption)
    : [],
  ["b"],
  "지운 옵션의 에셋 자리도 없앤다.",
);

const lastOptionDocument = createDocument();
applyStudioRemoveSelectOption(lastOptionDocument, "input_1", 0);
assert.equal(
  applyStudioRemoveSelectOption(lastOptionDocument, "input_1", 0),
  null,
  "마지막 옵션은 지울 수 없다.",
);

// --- 입력을 쓰는 곳 모으기 ---

const consumerDocument = createDocument();
consumerDocument.graph.nodes.text = {
  id: "text",
  type: "text",
  label: "Title",
  parentId: null,
  childIds: [],
  binding: { kind: "inputText", inputId: "input_2" },
} as unknown as StudioTemplateDocument["graph"]["nodes"][string];
consumerDocument.graph.nodes.slotted = {
  id: "slotted",
  type: "image",
  label: "Frame",
  parentId: null,
  childIds: [],
  assetSlots: { profileFrame: { inputId: "input_3" } },
} as unknown as StudioTemplateDocument["graph"]["nodes"][string];

const composition = {
  rootObjectIds: ["object"],
  objects: {
    object: {
      id: "object",
      kind: "group",
      label: "Memo",
      style: {},
      variantSet: { inputId: "input_4" },
      binding: { kind: "inputText", inputId: "input_2" },
      assetSlots: { asset: { inputId: "input_3" } },
    },
  },
} as unknown as StudioTimetableComposition;

const consumers = collectStudioInputConsumers(consumerDocument, composition);

assert.deepEqual(
  consumers.input_1?.map((consumer) => consumer.id),
  ["cards:image:binding"],
  "카드 바인딩을 모은다.",
);
assert.deepEqual(
  consumers.input_2?.map((consumer) => consumer.id),
  ["cards:text:binding", "timetable:object:binding"],
  "카드와 시간표 양쪽의 바인딩을 함께 모은다.",
);
assert.deepEqual(
  consumers.input_3?.map((consumer) => consumer.detail),
  ["Cards · Profile Frame", "Timetable · Asset"],
  "에셋 자리 이름을 사람이 읽는 형태로 보여준다.",
);
assert.deepEqual(
  consumers.input_4?.map((consumer) => consumer.detail),
  ["Timetable · Object State"],
  "객체 상태에 쓰는 입력도 모은다.",
);
assert.equal(consumers.input_5, undefined, "쓰지 않는 입력은 목록에 없다.");

console.log("Studio input command baseline checks passed.");
