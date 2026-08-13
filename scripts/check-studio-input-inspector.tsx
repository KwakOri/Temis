/**
 * 입력 인스펙터의 기준선 가드.
 *
 * 종류별로 어떤 필드가 보이는지, 옵션의 이름과 값이 서로 다른 명령으로 나가는지
 * 고정한다. 값은 런타임 값과 노드의 옵션별 에셋 지도에서 키로 쓰이므로 이름
 * 편집과 섞이면 조용히 연결이 끊어진다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  clampStudioTextInputRows,
  StudioInputInspector,
  type StudioInputInspectorProps,
} from "../src/app/(root)/template-studio/_components/studio-input-inspector";
import type {
  StudioInputDefinition,
  StudioSelectInputDefinition,
} from "../src/types/template-studio";
import type { StudioInputConsumerReference } from "../src/utils/template-studio/input-commands";

const textInput = (
  overrides: Record<string, unknown> = {},
): StudioInputDefinition =>
  ({
    id: "input_text",
    type: "text",
    scope: "entry",
    label: "Memo",
    placeholder: "Write here",
    defaultValue: "hello",
    ...overrides,
  }) as StudioInputDefinition;

const imageInput = (): StudioInputDefinition =>
  ({
    id: "input_image",
    type: "image",
    scope: "global",
    label: "Sticker",
    defaultUrl: "https://example.test/a.png",
  }) as StudioInputDefinition;

const selectInput = (): StudioSelectInputDefinition =>
  ({
    id: "input_select",
    type: "select",
    scope: "entry",
    label: "Pick",
    defaultValue: "a",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  }) as StudioSelectInputDefinition;

interface Calls {
  optionLabels: Array<[string, number, string]>;
  optionValues: Array<[string, number, string]>;
  addedOptions: string[];
  removedOptions: Array<[string, number]>;
  addedConsumers: Array<["text" | "image", string]>;
  jumpedInputs: string[];
  jumpedConsumers: string[];
  updates: StudioInputDefinition[];
}

const createProps = (
  input: StudioInputDefinition | null,
  calls: Calls,
  overrides: Partial<StudioInputInspectorProps> = {},
): StudioInputInspectorProps => ({
  input,
  consumers: [],
  isInputPanelActive: true,
  onUpdateInput: (inputId, updater) => {
    if (input) calls.updates.push(updater(input));
  },
  onJumpToInput: (inputId) => calls.jumpedInputs.push(inputId),
  onJumpToConsumer: (consumer) => calls.jumpedConsumers.push(consumer.id),
  onAddSelectConsumer: (selected, kind) =>
    calls.addedConsumers.push([kind, selected.id]),
  onAddSelectOption: (inputId) => calls.addedOptions.push(inputId),
  onRemoveSelectOption: (inputId, optionIndex) =>
    calls.removedOptions.push([inputId, optionIndex]),
  onUpdateSelectOptionLabel: (inputId, optionIndex, label) =>
    calls.optionLabels.push([inputId, optionIndex, label]),
  onUpdateSelectOptionValue: (inputId, optionIndex, value) =>
    calls.optionValues.push([inputId, optionIndex, value]),
  ...overrides,
});

const createCalls = (): Calls => ({
  optionLabels: [],
  optionValues: [],
  addedOptions: [],
  removedOptions: [],
  addedConsumers: [],
  jumpedInputs: [],
  jumpedConsumers: [],
  updates: [],
});

const markupOf = (
  input: StudioInputDefinition | null,
  overrides: Partial<StudioInputInspectorProps> = {},
): string =>
  renderToStaticMarkup(
    <StudioInputInspector {...createProps(input, createCalls(), overrides)} />,
  );

/** 만들어진 요소 나무에서 조건에 맞는 첫 요소를 찾는다. */
const findElement = (
  node: React.ReactNode,
  match: (props: Record<string, unknown>) => boolean,
): React.ReactElement<Record<string, never>> | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, match);
      if (found) return found;
    }
    return null;
  }

  if (!React.isValidElement(node)) return null;

  const props = node.props as Record<string, unknown>;
  if (match(props)) return node as React.ReactElement<Record<string, never>>;

  return findElement(props.children as React.ReactNode, match);
};

const findAll = (
  node: React.ReactNode,
  match: (props: Record<string, unknown>) => boolean,
  elementType?: string,
): Array<React.ReactElement<Record<string, never>>> => {
  const found: Array<React.ReactElement<Record<string, never>>> = [];

  const visit = (current: React.ReactNode) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!React.isValidElement(current)) return;

    const props = current.props as Record<string, unknown>;
    const typeMatches = !elementType || current.type === elementType;
    if (typeMatches && match(props)) {
      found.push(current as React.ReactElement<Record<string, never>>);
    }
    visit(props.children as React.ReactNode);
  };

  visit(node);
  return found;
};

// --- 줄 수 범위 ---

assert.equal(clampStudioTextInputRows(4), 4);
assert.equal(clampStudioTextInputRows(1), 2, "줄 수는 2보다 작아질 수 없다.");
assert.equal(clampStudioTextInputRows(99), 12, "줄 수는 12보다 커질 수 없다.");
assert.equal(clampStudioTextInputRows(0), 4, "값이 비면 기본 줄 수를 쓴다.");

// --- 고른 입력이 없을 때 ---

assert.ok(
  markupOf(null).includes("Select an input block."),
  "고른 입력이 없으면 안내만 보여준다.",
);

// --- 모든 종류가 함께 쓰는 필드 ---

const textMarkup = markupOf(textInput());
assert.ok(textMarkup.includes("<span>Label</span>"), "이름을 편집한다.");
assert.ok(textMarkup.includes("<span>Scope</span>"), "범위를 편집한다.");
assert.equal(
  (textMarkup.match(/<option value="(global|day|entry)"/g) ?? []).length,
  3,
  "범위 후보는 셋이다.",
);
assert.ok(
  textMarkup.includes("Consumers"),
  "이 입력을 쓰는 곳을 함께 보여준다.",
);
assert.ok(
  textMarkup.includes("No consumers"),
  "쓰는 곳이 없으면 없다고 알려준다.",
);

// --- Inputs 탭으로 가는 버튼 ---

assert.ok(
  !textMarkup.includes("Open in Inputs"),
  "이미 Inputs 탭이면 가는 버튼을 보여주지 않는다.",
);
assert.ok(
  markupOf(textInput(), { isInputPanelActive: false }).includes(
    "Open in Inputs",
  ),
  "다른 탭에서 열었으면 Inputs로 가는 버튼을 보여준다.",
);

// --- 글자 입력 ---

assert.ok(
  textMarkup.includes("<span>Placeholder</span>"),
  "글자 입력에는 안내 문구가 있다.",
);
assert.ok(
  textMarkup.includes("<span>Max Length</span>"),
  "글자 입력에는 길이 제한이 있다.",
);
assert.ok(
  textMarkup.includes("<span>Multiline</span>"),
  "글자 입력은 여러 줄로 바꿀 수 있다.",
);
assert.ok(
  !textMarkup.includes("<span>Rows</span>"),
  "한 줄 입력에는 줄 수 편집이 없다.",
);
assert.ok(
  !textMarkup.includes("<textarea"),
  "한 줄 입력의 기본값은 한 줄 칸으로 편집한다.",
);
assert.ok(
  !textMarkup.includes("<span>Default URL</span>"),
  "글자 입력에 이미지 전용 필드가 나오면 안 된다.",
);
assert.ok(
  !textMarkup.includes("Add option"),
  "글자 입력에 select 전용 옵션 목록이 나오면 안 된다.",
);

const multilineMarkup = markupOf(textInput({ multiline: true, minRows: 6 }));
assert.ok(
  multilineMarkup.includes("<span>Rows</span>"),
  "여러 줄 입력에는 줄 수 편집이 나타난다.",
);
assert.ok(
  multilineMarkup.includes('rows="6"'),
  "기본값 칸이 정한 줄 수를 쓴다.",
);

// --- 이미지 입력 ---

const imageMarkup = markupOf(imageInput());
assert.ok(
  imageMarkup.includes("<span>Default URL</span>"),
  "이미지 입력에는 기본 주소가 있다.",
);
assert.ok(
  !imageMarkup.includes("<span>Placeholder</span>"),
  "이미지 입력에는 글자 전용 필드가 없다.",
);
assert.ok(
  !imageMarkup.includes("Add option"),
  "이미지 입력에는 옵션 목록이 없다.",
);

// --- select 입력 ---

const selectMarkup = markupOf(selectInput());
assert.ok(
  selectMarkup.includes("<span>Default Option</span>"),
  "select 입력에는 기본 옵션 선택이 있다.",
);
assert.ok(selectMarkup.includes("Add option"), "옵션을 더할 수 있다.");
assert.equal(
  (selectMarkup.match(/>Del</g) ?? []).length,
  2,
  "옵션마다 지우기 버튼이 하나씩 붙는다.",
);
assert.ok(
  !selectMarkup.includes("<span>Max Length</span>"),
  "select 입력에는 글자 전용 필드가 없다.",
);

// 옵션이 하나만 남으면 지울 수 없다.
const singleOptionInput = {
  ...selectInput(),
  options: [{ value: "a", label: "A" }],
} as StudioSelectInputDefinition;
assert.ok(
  markupOf(singleOptionInput).includes('disabled=""'),
  "마지막 옵션은 지울 수 없다.",
);

// --- 옵션 이름과 값은 다른 명령으로 나간다 ---

const optionCalls = createCalls();
const optionElement = StudioInputInspector(
  createProps(selectInput(), optionCalls),
);
// option과 select도 같은 value를 가지므로 입력 칸만 고른다.
const optionInputs = findAll(
  optionElement,
  (props) => props.value === "A" || props.value === "a",
  "input",
);

assert.equal(
  optionInputs.length,
  2,
  "옵션 하나에 이름 칸과 값 칸이 따로 있다.",
);

const [labelField, valueField] = optionInputs as unknown as Array<
  React.ReactElement<{ onChange: (event: unknown) => void }>
>;

labelField.props.onChange({ currentTarget: { value: "Alpha" } });
valueField.props.onChange({ currentTarget: { value: "alpha" } });

assert.deepEqual(
  optionCalls.optionLabels,
  [["input_select", 0, "Alpha"]],
  "이름 편집은 이름 명령으로만 나간다.",
);
assert.deepEqual(
  optionCalls.optionValues,
  [["input_select", 0, "alpha"]],
  "값 편집은 값 명령으로만 나간다. 값은 런타임 값과 에셋 지도의 키다.",
);

// --- select 소비 노드 추가 ---

const consumerCalls = createCalls();
const consumerElement = StudioInputInspector(
  createProps(selectInput(), consumerCalls),
);
const textConsumerButton = findElement(
  consumerElement,
  (props) => Array.isArray(props.children) && props.children.includes("Text"),
) as React.ReactElement<{ onClick: () => void }> | null;

assert.ok(textConsumerButton, "글자 소비 노드 추가 버튼을 찾을 수 있다.");
textConsumerButton.props.onClick();
assert.deepEqual(
  consumerCalls.addedConsumers,
  [["text", "input_select"]],
  "고른 입력으로 소비 노드를 만든다.",
);

// --- 쓰는 곳 목록 ---

const consumers: StudioInputConsumerReference[] = [
  {
    id: "cards:text:binding",
    workspaceMode: "cards",
    targetId: "text",
    label: "Title",
    detail: "Cards · Binding",
  },
];

const listMarkup = markupOf(textInput(), { consumers });
assert.ok(listMarkup.includes("Title"), "쓰는 곳의 이름을 보여준다.");
assert.ok(
  listMarkup.includes("Cards · Binding"),
  "어디에서 쓰는지 함께 보여준다.",
);
assert.ok(
  !listMarkup.includes("No consumers"),
  "쓰는 곳이 있으면 없다고 하지 않는다.",
);

const jumpCalls = createCalls();
const jumpElement = StudioInputInspector(
  createProps(textInput(), jumpCalls, { consumers }),
);
const jumpButton = findAll(
  jumpElement,
  (props) => props.type === "button" && typeof props.onClick === "function",
  "button",
).at(-1) as React.ReactElement<{ onClick: () => void }> | undefined;

assert.ok(jumpButton, "쓰는 곳 버튼을 찾을 수 있다.");
jumpButton.props.onClick();
assert.deepEqual(
  jumpCalls.jumpedConsumers,
  ["cards:text:binding"],
  "쓰는 곳을 누르면 그곳으로 이동한다.",
);

console.log("Studio input inspector baseline checks passed.");
