/**
 * Studio 공통 레이어 패널의 기준선 가드.
 *
 * 카드 레이어 트리와 시간표 레이어 행이 공통 컴포넌트로 합쳐졌다. 추출 시점의
 * 행 표현, 들여쓰기, 드롭 표시와 정렬 규칙을 여기에 고정한다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioLayerPanel } from "../src/components/studio/layers/studio-layer-panel";
import {
  getStudioLayerIndent,
  StudioLayerDropIndicator,
  StudioLayerPanelFrame,
  StudioLayerRow,
} from "../src/components/studio/layers/studio-layer-primitives";
import type { StudioNodeGraph } from "../src/types/template-studio";

const noop = () => {};

// --- 들여쓰기 기준선 ---
//
// 추출 이전 `Math.min(10 + depth * 20, 70)`과 같아야 한다.

assert.deepEqual(
  [0, 1, 2, 3, 4, 5].map(getStudioLayerIndent),
  [10, 30, 50, 70, 70, 70],
  "레이어 들여쓰기 규칙과 상한이 바뀌면 안 된다.",
);

// --- 패널 프레임 기준선 ---

const frameMarkup = renderToStaticMarkup(
  <StudioLayerPanelFrame summary="3 placed objects" title="Cards Layers">
    <div data-row="a">a</div>
  </StudioLayerPanelFrame>,
);

assert.ok(
  frameMarkup.startsWith(
    '<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">' +
      '<div class="border-b border-[var(--border)] px-3 py-3">' +
      '<div class="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">Cards Layers</div>' +
      '<div class="mt-1 text-[11px] font-medium text-[var(--fg3)]">3 placed objects</div>' +
      "</div>",
  ),
  "레이어 패널의 제목 행 구성이 유지돼야 한다.",
);
assert.ok(
  frameMarkup.includes(
    '<div class="template-studio-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">' +
      '<div class="grid min-w-0 max-w-full gap-0.5 overflow-hidden">',
  ),
  "레이어 목록은 패널 안에서만 스크롤한다.",
);

// --- 행 표현 기준선 ---

const rowMarkup = (props: Partial<Parameters<typeof StudioLayerRow>[0]>) =>
  renderToStaticMarkup(
    <StudioLayerRow
      icon={<span>I</span>}
      label="Title"
      typeLabel="Text"
      {...props}
    />,
  );

const baseRow = rowMarkup({});
assert.ok(
  baseRow.startsWith(
    '<button class="flex h-[34px] w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[7px] px-2 text-left text-[12.5px] font-medium transition-colors cursor-default text-[var(--fg2)] hover:bg-[var(--hover)]" draggable="false" style="padding-left:10px" title="Title" type="button">',
  ),
  "기본 행의 높이, 들여쓰기와 기본 색이 유지돼야 한다.",
);
assert.ok(
  baseRow.includes('<span class="block min-w-0 flex-1 truncate">Title</span>'),
  "행 이름은 넘치면 잘린다.",
);
assert.ok(
  baseRow.includes(
    '<span class="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">Text</span>',
  ),
  "행 오른쪽 끝의 종류 표시가 유지돼야 한다.",
);
assert.ok(
  !baseRow.includes("rotate-90"),
  "접을 수 없는 행은 chevron을 돌리지 않는다.",
);

assert.ok(
  rowMarkup({ selected: true }).includes(
    "bg-[var(--sel)] font-semibold text-[var(--fg)]",
  ),
  "선택한 행은 강조된다.",
);
assert.ok(
  rowMarkup({ draggable: true }).includes("cursor-grab active:cursor-grabbing"),
  "옮길 수 있는 행은 잡는 커서를 쓴다.",
);
assert.ok(
  rowMarkup({ draggable: true }).includes('draggable="true"'),
  "옮길 수 있는 행에는 draggable이 붙는다.",
);
assert.ok(
  !rowMarkup({ draggable: true, disabled: true }).includes('draggable="true"'),
  "비활성 행은 옮길 수 없다.",
);
assert.ok(
  rowMarkup({ disabled: true }).includes("cursor-not-allowed opacity-45"),
  "비활성 행 표현이 유지돼야 한다.",
);
assert.ok(
  !rowMarkup({ disabled: true, selected: true }).includes("bg-[var(--sel)]"),
  "비활성 행은 선택 강조를 쓰지 않는다.",
);
assert.ok(
  rowMarkup({ hidden: true }).includes("opacity-55"),
  "숨긴 레이어는 흐리게 표시한다.",
);
assert.ok(
  rowMarkup({ cut: true }).includes("opacity-[0.45]"),
  "잘라낸 레이어는 더 흐리게 표시한다.",
);
assert.ok(
  rowMarkup({ ring: "accent" }).includes(
    "ring-1 ring-inset ring-[var(--accent)]",
  ),
  "안쪽 드롭 대상은 강조 테두리를 쓴다.",
);
assert.ok(
  rowMarkup({ ring: "blocked" }).includes("ring-1 ring-inset ring-rose-400/80"),
  "드롭할 수 없는 대상은 경고 테두리를 쓴다.",
);
assert.ok(
  rowMarkup({ blockedReason: "Root timetable object is locked" }).includes(
    'title="Root timetable object is locked"',
  ),
  "드롭할 수 없는 이유를 title로 보여준다.",
);
assert.equal(
  rowMarkup({ depth: 2 }).includes('style="padding-left:50px"'),
  true,
  "깊이에 따라 들여쓴다.",
);

const collapsibleRow = rowMarkup({ collapsible: true });
assert.ok(
  collapsibleRow.includes('title="Collapse group"'),
  "펼친 그룹은 접기 안내를 보여준다.",
);
assert.ok(
  collapsibleRow.includes("rotate-90"),
  "펼친 그룹은 chevron을 돌린다.",
);
const collapsedRow = rowMarkup({ collapsible: true, collapsed: true });
assert.ok(
  collapsedRow.includes('title="Expand group"'),
  "접은 그룹은 펼치기 안내를 보여준다.",
);
assert.ok(
  !collapsedRow.includes("rotate-90"),
  "접은 그룹은 chevron을 돌리지 않는다.",
);

// --- 드롭 표시선 기준선 ---

const dropMarkup = renderToStaticMarkup(
  <StudioLayerDropIndicator
    depth={1}
    position="before"
    onDragOver={noop}
    onDrop={noop}
  />,
);
assert.ok(
  dropMarkup.includes('style="margin-left:30px"'),
  "드롭 표시선도 행과 같은 들여쓰기를 쓴다.",
);
assert.ok(
  dropMarkup.includes(">Above</span>") && dropMarkup.includes('title="Above"'),
  "before 드롭은 Above로 보여준다.",
);
assert.ok(
  renderToStaticMarkup(
    <StudioLayerDropIndicator
      depth={0}
      position="after"
      onDragOver={noop}
      onDrop={noop}
    />,
  ).includes(">Below</span>"),
  "after 드롭은 Below로 보여준다.",
);
const blockedDropMarkup = renderToStaticMarkup(
  <StudioLayerDropIndicator
    blockedReason="Root timetable object is locked"
    depth={0}
    position="before"
    onDragOver={noop}
    onDrop={noop}
  />,
);
assert.ok(
  blockedDropMarkup.includes(">Blocked</span>"),
  "막힌 드롭은 Blocked로 보여준다.",
);
assert.ok(
  blockedDropMarkup.includes("bg-rose-400") &&
    blockedDropMarkup.includes("text-rose-300"),
  "막힌 드롭은 경고 색을 쓴다.",
);

// --- 그래프 레이어 패널 기준선 ---

const graph: StudioNodeGraph = {
  rootNodeIds: ["root"],
  nodes: {
    root: {
      id: "root",
      type: "group",
      label: "Root group",
      parentId: null,
      childIds: ["back", "front"],
    },
    back: {
      id: "back",
      type: "text",
      label: "Back text",
      parentId: "root",
      childIds: [],
    },
    front: {
      id: "front",
      type: "flexibleText",
      label: "Front auto text",
      parentId: "root",
      childIds: [],
      locked: true,
    },
    orphan: {
      id: "orphan",
      type: "image",
      label: "Orphan image",
      parentId: null,
      childIds: [],
    },
  },
};

const panelProps = {
  collapsedNodeIds: new Set<string>(),
  graph,
  onDragEnd: noop,
  onDragOver: noop,
  onDragStart: noop,
  onDrop: noop,
  onIndicatorDragOver: noop,
  onSelect: noop,
  onToggleCollapsed: noop,
  rootNodeIds: ["orphan", "root"],
  selectedNodeIds: new Set<string>(["back"]),
  summary: "2 placed objects",
  title: "Cards Layers",
};

const panelMarkup = renderToStaticMarkup(<StudioLayerPanel {...panelProps} />);

// 패널은 앞에 있는 형제를 위에 보여준다. 저장 순서의 역순이다.
const labelOrder = [
  ...panelMarkup.matchAll(
    /<span class="block min-w-0 flex-1 truncate">([^<]+)</g,
  ),
].map((match) => match[1]);
assert.deepEqual(
  labelOrder,
  ["Root group", "Front auto text", "Back text", "Orphan image"],
  "레이어 패널은 앞에 있는 형제를 먼저 보여준다.",
);

assert.ok(
  panelMarkup.includes(">Auto Text</span>"),
  "flexibleText는 Auto Text로 표시한다.",
);
assert.ok(
  panelMarkup.includes(">Group</span>") &&
    panelMarkup.includes(">Text</span>") &&
    panelMarkup.includes(">Image</span>"),
  "노드 종류 표시가 유지돼야 한다.",
);
assert.equal(
  (panelMarkup.match(/style="padding-left:30px"/g) ?? []).length,
  2,
  "자식 행은 한 단계 들여쓴다.",
);
assert.equal(
  (panelMarkup.match(/bg-\[var\(--sel\)\] font-semibold/g) ?? []).length,
  1,
  "선택 강조는 선택한 노드에만 붙는다.",
);
assert.ok(
  panelMarkup.includes('draggable="true"'),
  "잠기지 않은 노드는 옮길 수 있다.",
);

// 잠긴 노드는 옮길 수 없고 자물쇠를 보여준다.
const rowSegment = (markup: string, rowLabel: string) => {
  const segment = markup
    .split("<button")
    .find((part) => part.includes(rowLabel));
  assert.ok(segment, `행을 찾을 수 없다: ${rowLabel}`);
  return segment;
};

const lockedRowSegment = rowSegment(panelMarkup, "Front auto text");
assert.ok(
  lockedRowSegment.includes("lucide-lock"),
  "잠긴 노드는 자물쇠 아이콘을 보여준다.",
);
assert.ok(
  lockedRowSegment.includes('draggable="false"'),
  "잠긴 노드는 옮길 수 없다.",
);
assert.ok(
  rowSegment(panelMarkup, "Back text").includes('draggable="true"'),
  "잠기지 않은 노드는 옮길 수 있다.",
);

// 접은 그룹은 자식을 렌더하지 않는다.
const collapsedPanelMarkup = renderToStaticMarkup(
  <StudioLayerPanel
    {...panelProps}
    collapsedNodeIds={new Set<string>(["root"])}
  />,
);
assert.ok(
  !collapsedPanelMarkup.includes("Back text"),
  "접은 그룹의 자식은 렌더하지 않는다.",
);
assert.ok(
  collapsedPanelMarkup.includes("Root group"),
  "접은 그룹 자신은 계속 보인다.",
);

// 잘라낸 노드 표시
assert.ok(
  renderToStaticMarkup(
    <StudioLayerPanel {...panelProps} cutNodeIds={new Set(["back"])} />,
  ).includes("opacity-[0.45]"),
  "잘라낸 노드는 흐리게 보인다.",
);

// 드롭 상태는 해당 노드에만 반영된다.
const insideDropPanelMarkup = renderToStaticMarkup(
  <StudioLayerPanel
    {...panelProps}
    dropState={{ nodeId: "root", position: "inside" }}
  />,
);
assert.ok(
  insideDropPanelMarkup.includes("ring-1 ring-inset ring-[var(--accent)]"),
  "안쪽 드롭 대상은 테두리로 표시한다.",
);
assert.ok(
  insideDropPanelMarkup.includes(">Inside</span>"),
  "안쪽 드롭 대상은 Inside 배지를 보여준다.",
);
assert.ok(
  !insideDropPanelMarkup.includes(">Above</span>") &&
    !insideDropPanelMarkup.includes(">Below</span>"),
  "안쪽 드롭에는 표시선을 그리지 않는다.",
);

const beforeDropPanelMarkup = renderToStaticMarkup(
  <StudioLayerPanel
    {...panelProps}
    dropState={{ nodeId: "back", position: "before" }}
  />,
);
assert.equal(
  (beforeDropPanelMarkup.match(/>Above</g) ?? []).length,
  1,
  "표시선은 드롭 대상 한 곳에만 그린다.",
);

// 순환 참조는 트리를 멈추고 알린다.
const cyclicGraph: StudioNodeGraph = {
  rootNodeIds: ["a"],
  nodes: {
    a: { id: "a", type: "group", label: "A", parentId: null, childIds: ["b"] },
    b: { id: "b", type: "group", label: "B", parentId: "a", childIds: ["a"] },
  },
};
const cyclicMarkup = renderToStaticMarkup(
  <StudioLayerPanel {...panelProps} graph={cyclicGraph} rootNodeIds={["a"]} />,
);
assert.ok(
  cyclicMarkup.includes("Cycle: A"),
  "순환 참조는 Cycle 표시로 멈춘다.",
);

console.log("Studio layer panel baseline checks passed.");
