/**
 * 프리셋 목록의 기준선 가드.
 *
 * 목록에는 아직 만들지 않은 프리셋도 함께 있다. 무엇이 앞으로 생기는지 보여주되
 * 누를 수는 없어야 한다. 누를 수 있게 보이면 눌러도 아무 일이 없고, 사용자는
 * 편집기가 멈춘 것으로 읽는다.
 *
 * 넣을 수 없는 프리셋은 이유를 함께 보여준다. 흐리게만 두면 왜 눌리지 않는지 알
 * 수 없다. 이미 넣은 프리셋은 또 넣는 것이 아니라 그것을 고르는 동작이므로 그렇게
 * 알려준다. 그러지 않으면 같은 것을 두 번 넣으려다 실패한다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getStudioPresetStatusLabel,
  StudioCardsPresetsPanel,
  StudioTimetablePresetsPanel,
} from "../src/app/(root)/template-studio/_components/studio-preset-panels";
import type {
  StudioPresetDefinition,
  StudioPresetGroup,
  StudioPresetListItem,
} from "../src/utils/template-studio/preset-registry";
const noop = () => {};
const createItem = (
  definition: Partial<StudioPresetDefinition>,
  overrides: Partial<StudioPresetListItem> = {},
): StudioPresetListItem =>
  ({
    definition: {
      id: "preset_a",
      label: "Preset A",
      typeLabel: "Text",
      category: "timetable",
      ...definition,
    },
    disabledReason: null,
    existingTargetId: null,
    ...overrides,
  }) as unknown as StudioPresetListItem;
const groupsOf = (items: StudioPresetListItem[]): StudioPresetGroup[] =>
  [{ title: "Objects", presets: items }] as unknown as StudioPresetGroup[];
// --- 상태 말 기준선 ---
//
// 넣을 수 없는 이유가 있으면 그것이 먼저다. 이유를 감추면 왜 눌리지 않는지 알 수 없다.
assert.equal(
  getStudioPresetStatusLabel(
    createItem({ kind: "timetableCompositionObject" }),
  ),
  "Text",
  "넣을 수 있는 프리셋은 종류 이름을 보여준다.",
);
assert.equal(
  getStudioPresetStatusLabel(
    createItem(
      { kind: "timetableCompositionObject" },
      { existingTargetId: "obj_1" },
    ),
  ),
  "Added",
  "이미 넣은 프리셋은 넣은 상태임을 알려준다.",
);
assert.equal(
  getStudioPresetStatusLabel(
    createItem(
      { kind: "timetableCompositionObject" },
      { disabledReason: "Needs a day card first", existingTargetId: "obj_1" },
    ),
  ),
  "Needs a day card first",
  "넣을 수 없는 이유가 있으면 넣은 상태보다 이유를 먼저 보여준다.",
);
// --- 시간표 프리셋 목록 기준선 ---
const timetableMarkup = renderToStaticMarkup(
  <StudioTimetablePresetsPanel
    groups={groupsOf([
      createItem({ kind: "timetableCompositionObject" }),
      createItem({
        id: "preset_planned",
        label: "Planned",
        kind: "planned",
      }),
      createItem(
        {
          id: "preset_added",
          label: "Added Preset",
          kind: "timetableCompositionObject",
        },
        { existingTargetId: "obj_1" },
      ),
      createItem(
        {
          id: "preset_blocked",
          label: "Blocked",
          kind: "timetableCompositionObject",
        },
        { disabledReason: "Needs a day card first" },
      ),
    ])}
    onInsertPreset={noop}
  />,
);
assert.ok(timetableMarkup.includes(">4 presets<"), "목록에 있는 수를 센다.");
assert.equal(
  (timetableMarkup.match(/disabled=""/g) ?? []).length,
  2,
  "계획만 세워 둔 프리셋과 넣을 수 없는 프리셋만 누를 수 없다.",
);
assert.ok(
  timetableMarkup.includes('title="Needs a day card first"') === false,
  "행의 title은 프리셋 설명 자리다. 막힌 이유는 상태 줄에 적는다.",
);
assert.ok(
  timetableMarkup.includes(">Needs a day card first</span>"),
  "넣을 수 없는 이유를 눈에 보이게 적는다.",
);
assert.equal(
  (timetableMarkup.match(/lucide-circle-check/g) ?? []).length,
  1,
  "이미 넣은 프리셋만 넣었다는 표시를 붙인다.",
);
assert.equal(
  (timetableMarkup.match(/lucide-plus/g) ?? []).length,
  3,
  "아직 넣지 않은 프리셋에는 더하기 표시를 붙인다.",
);
assert.ok(
  timetableMarkup.includes("cursor-not-allowed opacity-55"),
  "누를 수 없는 프리셋은 흐리게 보여준다.",
);
assert.ok(
  renderToStaticMarkup(
    <StudioTimetablePresetsPanel groups={[]} onInsertPreset={noop} />,
  ).includes("No presets yet."),
  "프리셋이 없으면 없다고 알린다.",
);
// 설명이 있으면 설명을 보여주고, 없으면 이름을 보여준다.
assert.ok(
  renderToStaticMarkup(
    <StudioTimetablePresetsPanel
      groups={groupsOf([
        createItem({
          kind: "timetableCompositionObject",
          description: "Adds the weekly memo block",
        }),
      ])}
      onInsertPreset={noop}
    />,
  ).includes('title="Adds the weekly memo block"'),
  "설명이 있으면 설명을 알려준다.",
);
// --- 카드 프리셋 목록 기준선 ---
const cardsMarkup = renderToStaticMarkup(
  <StudioCardsPresetsPanel
    groups={groupsOf([
      createItem({ id: "ctx", label: "Context", kind: "cardContextObject" }),
      createItem({
        id: "bg",
        label: "Background",
        kind: "cardStatusBackgroundObject",
      }),
      createItem({
        id: "bundle",
        label: "Sticker",
        kind: "cardSelectInputBundle",
      }),
      createItem({ id: "planned", label: "Planned", kind: "planned" }),
      createItem(
        { id: "added", label: "Added", kind: "cardContextObject" },
        { existingTargetId: "node_1" },
      ),
      createItem(
        { id: "blocked", label: "Blocked", kind: "cardContextObject" },
        { disabledReason: "Needs a card first" },
      ),
    ])}
    onAddContextObject={noop}
    onAddNode={noop}
    onAddSelectInputBundle={noop}
    onAddStatusBackground={noop}
  />,
);
// 빈 객체를 놓는 자리 넷과 프리셋 여섯.
assert.equal(
  (cardsMarkup.match(/<button/g) ?? []).length,
  10,
  "빈 객체 넷과 프리셋 여섯을 모두 보여준다.",
);
assert.equal(
  (cardsMarkup.match(/disabled=""/g) ?? []).length,
  2,
  "계획만 세워 둔 프리셋과 넣을 수 없는 프리셋만 누를 수 없다.",
);
assert.ok(
  cardsMarkup.includes('title="Needs a card first"'),
  "넣을 수 없는 이유를 알려준다. 흐리게만 두면 왜 눌리지 않는지 알 수 없다.",
);
assert.ok(
  cardsMarkup.includes('title="Select existing Added"'),
  "이미 넣은 프리셋을 누르면 그것을 고른다고 알려준다.",
);
assert.ok(
  cardsMarkup.includes('title="Add Context"'),
  "아직 없는 프리셋은 넣는 동작임을 알려준다.",
);
assert.deepEqual(
  [...cardsMarkup.matchAll(/title="Add (Group|Text|Auto Text|Image)"/g)].map(
    (match) => match[1],
  ),
  ["Group", "Text", "Auto Text", "Image"],
  "빈 객체는 묶음, 글자, 늘어나는 글자, 사진 순으로 놓는다.",
);
assert.equal(
  (cardsMarkup.match(/lucide-circle-check/g) ?? []).length,
  1,
  "이미 넣은 프리셋만 넣었다는 표시를 붙인다.",
);
assert.ok(
  renderToStaticMarkup(
    <StudioCardsPresetsPanel
      groups={[]}
      onAddContextObject={noop}
      onAddNode={noop}
      onAddSelectInputBundle={noop}
      onAddStatusBackground={noop}
    />,
  ).includes("No card presets yet."),
  "카드 프리셋이 없으면 없다고 알린다.",
);
// --- 종류별로 갈라 넣는 기준선 ---
//
// 프리셋은 종류마다 넣는 방법이 다르다. 갈라 부르지 않으면 엉뚱한 것이 문서에 들어간다.
const calls: string[] = [];
const cardsTree = StudioCardsPresetsPanel({
  groups: groupsOf([
    createItem({ id: "ctx", label: "Context", kind: "cardContextObject" }),
    createItem({
      id: "bg",
      label: "Background",
      kind: "cardStatusBackgroundObject",
    }),
    createItem({
      id: "bundle",
      label: "Sticker",
      kind: "cardSelectInputBundle",
    }),
    createItem({ id: "planned", label: "Planned", kind: "planned" }),
  ]),
  onAddNode: (type) => calls.push(`node:${type}`),
  onAddContextObject: (definition) => calls.push(`ctx:${definition.id}`),
  onAddStatusBackground: (definition) => calls.push(`bg:${definition.id}`),
  onAddSelectInputBundle: (definition) => calls.push(`bundle:${definition.id}`),
});
/** 만들어진 요소 나무에서 누를 수 있는 단추를 모은다. */
const findButtons = (
  node: React.ReactNode,
): Array<{ onClick: () => void; disabled?: boolean; title?: string }> => {
  const found: Array<{
    onClick: () => void;
    disabled?: boolean;
    title?: string;
  }> = [];

  const visit = (current: React.ReactNode) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!React.isValidElement(current)) return;

    const props = current.props as Record<string, unknown>;
    if (current.type === "button" && typeof props.onClick === "function") {
      found.push(
        props as unknown as {
          onClick: () => void;
          disabled?: boolean;
          title?: string;
        },
      );
    }
    visit(props.children as React.ReactNode);
  };

  visit(node);
  return found;
};
const cardButtons = findButtons(cardsTree);
cardButtons.forEach((button) => button.onClick());
assert.deepEqual(
  calls,
  [
    "node:group",
    "node:text",
    "node:flexibleText",
    "node:image",
    "ctx:ctx",
    "bg:bg",
    "bundle:bundle",
  ],
  "종류에 맞는 길로 넣는다. 계획만 세워 둔 프리셋은 눌러도 아무 일도 하지 않는다.",
);
const timetableCalls: string[] = [];
findButtons(
  StudioTimetablePresetsPanel({
    groups: groupsOf([
      createItem({ kind: "timetableCompositionObject" }),
      createItem({ id: "planned", label: "Planned", kind: "planned" }),
    ]),
    onInsertPreset: (definition) => timetableCalls.push(definition.id),
  }),
).forEach((button) => button.onClick());
assert.deepEqual(
  timetableCalls,
  ["preset_a"],
  "계획만 세워 둔 시간표 프리셋은 눌러도 문서를 바꾸지 않는다.",
);
console.log("Studio preset panel baseline checks passed.");
