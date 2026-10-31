/**
 * 클립보드 명령의 기준선 가드.
 *
 * 복사는 값을 복제하고 잘라내기는 원본을 옮긴다. 시간표 구조를 지키는 규칙,
 * 곧 카드 variant 루트와 Entry Group은 잘라낼 수 없고 시간표 root 객체는 부모를
 * 바꿀 수 없다는 규칙이 이 편집기의 구조 규칙이라 값으로 고정해 둔다.
 */
import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  applyStudioPasteCopy,
  applyStudioPasteCut,
  isStudioPasteCopyReady,
  planStudioCopyNodes,
  planStudioCutNodes,
  planStudioPasteCut,
} from "../src/utils/template-studio/clipboard-commands";
import type { StudioNodeCopyPayload } from "../src/utils/template-studio/node-clipboard";

const createNode = (
  id: string,
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode => ({
  id,
  type: "text",
  label: id,
  parentId: null,
  childIds: [],
  styleId: `${id}_style`,
  ...overrides,
});

/**
 * root(group) > child, loose, mount 구조의 문서.
 *
 * mount는 시간표 root 객체다.
 */
const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 1000, height: 1000, background: "#fff" },
    graph: {
      rootNodeIds: ["root", "loose", "mount"],
      nodes: {
        root: createNode("root", { type: "group", childIds: ["child"] }),
        child: createNode("child", { parentId: "root" }),
        loose: createNode("loose"),
        mount: createNode("mount", { type: "group" }),
      },
    },
    inputs: {},
    styles: {
      root_style: { left: 0, top: 0 },
      child_style: { left: 5, top: 5 },
      loose_style: { left: 10, top: 10 },
      mount_style: { left: 20, top: 20 },
    },
    assets: {},
    domains: { timetable: { mountNodeId: "mount" } },
  }) as unknown as StudioTemplateDocument;

// --- 복사 ---

assert.deepEqual(
  planStudioCopyNodes(createDocument(), []),
  { ok: false, reason: "No object selected" },
  "고른 노드가 없으면 복사하지 않는다.",
);

const copyPlan = planStudioCopyNodes(createDocument(), ["root", "child"]);
assert.equal(copyPlan.ok, true);
if (!copyPlan.ok) throw new Error("unreachable");
assert.deepEqual(
  copyPlan.payload.rootNodeIds,
  ["root"],
  "조상이 함께 선택된 노드는 최상위 하나로 줄인다.",
);
assert.deepEqual(
  Object.keys(copyPlan.payload.nodes).sort(),
  ["child", "root"],
  "자손까지 값으로 담는다.",
);

// --- 잘라내기 ---

assert.deepEqual(
  planStudioCutNodes(createDocument(), [], null),
  { ok: false, reason: "No object selected" },
  "고른 노드가 없으면 잘라내지 않는다.",
);

const cutPlan = planStudioCutNodes(createDocument(), ["loose"], "loose");
assert.equal(cutPlan.ok, true);
if (!cutPlan.ok) throw new Error("unreachable");
assert.deepEqual(cutPlan.payload, {
  kind: "cut",
  rootNodeIds: ["loose"],
  primaryNodeId: "loose",
});

const entrySlotDocument = createDocument();
entrySlotDocument.graph.nodes.loose.meta = { entrySlot: "mon" } as never;
assert.deepEqual(
  planStudioCutNodes(entrySlotDocument, ["loose"], "loose"),
  {
    ok: false,
    reason: "Card variant roots and Entry Groups cannot be cut",
  },
  "Entry Group은 자리를 옮기면 시간표 구조가 깨지므로 잘라낼 수 없다.",
);

const variantRootDocument = createDocument();
variantRootDocument.domains = {
  timetable: {
    mountNodeId: "mount",
    components: {
      card: { variants: { online: { rootNodeId: "loose" } } },
    },
  },
} as never;
assert.deepEqual(
  planStudioCutNodes(variantRootDocument, ["loose"], "loose"),
  {
    ok: false,
    reason: "Card variant roots and Entry Groups cannot be cut",
  },
  "카드 variant 루트도 잘라낼 수 없다.",
);

const lockedDocument = createDocument();
lockedDocument.graph.nodes.loose.locked = true;
assert.deepEqual(
  planStudioCutNodes(lockedDocument, ["loose"], "loose"),
  { ok: false, reason: "Selection includes locked object" },
  "잠긴 노드는 잘라낼 수 없다.",
);

// --- 잘라낸 노드 붙여넣기 ---

assert.deepEqual(
  planStudioPasteCut(
    createDocument(),
    { kind: "cut", rootNodeIds: ["gone"], primaryNodeId: "gone" },
    "loose",
  ),
  { ok: false, reason: "Cut source is missing", clearClipboard: true },
  "원본이 사라졌으면 클립보드를 비우라고 알린다.",
);

assert.deepEqual(
  planStudioPasteCut(
    createDocument(),
    { kind: "cut", rootNodeIds: ["loose"], primaryNodeId: "loose" },
    null,
  ),
  { ok: false, reason: "Select a destination before pasting cut objects" },
  "잘라낸 노드는 놓을 자리를 고른 뒤에만 붙일 수 있다.",
);

assert.deepEqual(
  planStudioPasteCut(
    createDocument(),
    { kind: "cut", rootNodeIds: ["mount"], primaryNodeId: "mount" },
    "child",
  ),
  { ok: false, reason: "Root timetable object cannot move to another parent" },
  "시간표 root 객체는 다른 부모로 옮길 수 없다.",
);

const pasteCutDocument = createDocument();
const pasteCutPlan = planStudioPasteCut(
  pasteCutDocument,
  { kind: "cut", rootNodeIds: ["loose"], primaryNodeId: "loose" },
  "child",
);
assert.equal(pasteCutPlan.ok, true);
if (!pasteCutPlan.ok) throw new Error("unreachable");

const moveResult = applyStudioPasteCut(pasteCutDocument, pasteCutPlan);
assert.equal(moveResult.ok, true);
assert.deepEqual(
  pasteCutDocument.graph.nodes.root.childIds,
  ["child", "loose"],
  "고른 노드 뒤로 옮긴다.",
);
assert.equal(
  pasteCutDocument.graph.nodes.loose.parentId,
  "root",
  "부모도 함께 바뀐다.",
);
assert.equal(
  pasteCutDocument.graph.rootNodeIds.includes("loose"),
  false,
  "원본은 이전 자리에서 빠진다.",
);
assert.deepEqual(
  pasteCutDocument.styles.loose_style,
  { left: 10, top: 10 },
  "화면 위치는 유지한다.",
);

// --- 복사한 노드 붙여넣기 ---

const copyPayload = planStudioCopyNodes(createDocument(), ["root"]);
if (!copyPayload.ok) throw new Error("unreachable");

assert.equal(isStudioPasteCopyReady(copyPayload.payload), true);
assert.equal(
  isStudioPasteCopyReady({
    kind: "copy",
    rootNodeIds: ["gone"],
    nodes: {},
    styles: {},
  } satisfies StudioNodeCopyPayload),
  false,
  "붙여넣을 원본이 없으면 실패로 본다.",
);

const pasteCopyDocument = createDocument();
const pastedRootIds = applyStudioPasteCopy(
  pasteCopyDocument,
  copyPayload.payload,
  null,
);
assert.equal(pastedRootIds.length, 1);
const pastedRootId = pastedRootIds[0];
assert.notEqual(pastedRootId, "root", "새 id를 받는다.");
assert.deepEqual(
  pasteCopyDocument.graph.rootNodeIds,
  ["root", pastedRootId, "loose", "mount"],
  "고른 노드가 없으면 원본 뒤에 놓는다.",
);
assert.equal(
  pasteCopyDocument.graph.nodes[pastedRootId].childIds.length,
  1,
  "자손도 함께 복제한다.",
);
assert.notEqual(
  pasteCopyDocument.graph.nodes[pastedRootId].childIds[0],
  "child",
  "자손도 새 id를 받는다.",
);
assert.equal(
  pasteCopyDocument.graph.nodes[pastedRootId].label,
  "root Copy",
  "복제본 이름에 Copy를 붙인다.",
);
assert.deepEqual(
  pasteCopyDocument.styles[
    pasteCopyDocument.graph.nodes[pastedRootId].styleId as string
  ],
  { left: 24, top: 24 },
  "복제본은 원본에서 밀어낸 자리에 놓는다.",
);

// 고른 노드가 있으면 그 뒤, 부모가 잠겨 있으면 문서 루트로.
const pasteAfterDocument = createDocument();
const pasteAfterIds = applyStudioPasteCopy(
  pasteAfterDocument,
  copyPayload.payload,
  pasteAfterDocument.graph.nodes.child,
);
assert.deepEqual(
  pasteAfterDocument.graph.nodes.root.childIds,
  ["child", pasteAfterIds[0]],
  "고른 노드 뒤 형제로 넣는다.",
);

const lockedParentDocument = createDocument();
lockedParentDocument.graph.nodes.root.locked = true;
const lockedParentIds = applyStudioPasteCopy(
  lockedParentDocument,
  copyPayload.payload,
  lockedParentDocument.graph.nodes.child,
);
assert.equal(
  lockedParentDocument.graph.nodes[lockedParentIds[0]].parentId,
  null,
  "부모가 잠겨 있으면 문서 루트로 올린다.",
);

// --- 카드 variant 사이 붙여넣기 ---

/**
 * online·offline 카드 variant가 있는 문서.
 *
 * variant 루트는 문서 루트에 있다. online 안에는 day와 묶음 entry(> time)가 있다.
 * offline 루트는 online과 캔버스 위치가 다르다.
 */
const createCardDocument = (): StudioTemplateDocument =>
  ({
    ...createDocument(),
    graph: {
      rootNodeIds: ["online", "offline"],
      nodes: {
        online: createNode("online", {
          type: "group",
          childIds: ["day", "entry"],
        }),
        day: createNode("day", { parentId: "online" }),
        entry: createNode("entry", {
          type: "group",
          parentId: "online",
          childIds: ["time"],
        }),
        time: createNode("time", { parentId: "entry" }),
        offline: createNode("offline", {
          type: "group",
          childIds: ["offlineDay"],
        }),
        offlineDay: createNode("offlineDay", { parentId: "offline" }),
      },
    },
    styles: {
      online_style: { left: 160, top: 120 },
      day_style: { left: 30, top: 40 },
      entry_style: { left: 100, top: 200 },
      time_style: { left: 5, top: 6 },
      offline_style: { left: 900, top: 120 },
      offlineDay_style: { left: 30, top: 40 },
    },
    domains: {
      timetable: {
        components: {
          card: {
            variants: {
              online: { rootNodeId: "online" },
              offline: { rootNodeId: "offline" },
            },
          },
        },
      },
    },
  }) as unknown as StudioTemplateDocument;

const getStyleOf = (document: StudioTemplateDocument, nodeId: string) =>
  document.styles[document.graph.nodes[nodeId].styleId as string];

const dayCopyPlan = planStudioCopyNodes(createCardDocument(), ["day"]);
if (!dayCopyPlan.ok) throw new Error("unreachable");

const variantRootPasteDocument = createCardDocument();
const variantRootPasteIds = applyStudioPasteCopy(
  variantRootPasteDocument,
  dayCopyPlan.payload,
  variantRootPasteDocument.graph.nodes.offline,
  { scopeRootNodeId: "offline" },
);
assert.deepEqual(
  variantRootPasteDocument.graph.nodes.offline.childIds,
  ["offlineDay", variantRootPasteIds[0]],
  "카드 variant 루트를 고른 채 붙이면 원본 variant가 아니라 그 카드 안 맨 위에 넣는다.",
);
assert.deepEqual(
  variantRootPasteDocument.graph.nodes.online.childIds,
  ["day", "entry"],
  "원본 variant에는 붙이지 않는다.",
);
assert.deepEqual(
  getStyleOf(variantRootPasteDocument, variantRootPasteIds[0]),
  { left: 54, top: 64 },
  "카드 안 같은 자리에서 원본처럼 밀어낸다. variant 루트끼리 캔버스 위치가 달라도 같다.",
);

const noSelectionDocument = createCardDocument();
const noSelectionIds = applyStudioPasteCopy(
  noSelectionDocument,
  dayCopyPlan.payload,
  null,
  { scopeRootNodeId: "offline" },
);
assert.equal(
  noSelectionDocument.graph.nodes[noSelectionIds[0]].parentId,
  "offline",
  "고른 노드가 없고 원본이 다른 variant에 있으면 지금 보고 있는 카드에 넣는다.",
);

const outOfScopeDocument = createCardDocument();
const outOfScopeIds = applyStudioPasteCopy(
  outOfScopeDocument,
  dayCopyPlan.payload,
  outOfScopeDocument.graph.nodes.day,
  { scopeRootNodeId: "offline" },
);
assert.equal(
  outOfScopeDocument.graph.nodes[outOfScopeIds[0]].parentId,
  "offline",
  "고른 노드가 지금 보고 있는 카드 밖이면 무시하고 그 카드에 넣는다.",
);

const sameScopeDocument = createCardDocument();
const sameScopeIds = applyStudioPasteCopy(
  sameScopeDocument,
  dayCopyPlan.payload,
  null,
  { scopeRootNodeId: "online" },
);
assert.deepEqual(
  sameScopeDocument.graph.nodes.online.childIds,
  ["day", sameScopeIds[0], "entry"],
  "원본이 지금 보고 있는 카드 안에 있으면 원본 뒤에 놓는다.",
);

const inPlaceDocument = createCardDocument();
const inPlaceIds = applyStudioPasteCopy(
  inPlaceDocument,
  dayCopyPlan.payload,
  inPlaceDocument.graph.nodes.offline,
  { scopeRootNodeId: "offline", inPlace: true },
);
assert.deepEqual(
  getStyleOf(inPlaceDocument, inPlaceIds[0]),
  { left: 30, top: 40 },
  "제자리 붙여넣기는 카드 안 원본과 같은 자리에 놓는다.",
);
assert.equal(
  inPlaceDocument.graph.nodes[inPlaceIds[0]].label,
  "day Copy",
  "제자리 붙여넣기도 복제본 이름에 Copy를 붙인다.",
);

const nestedCopyPlan = planStudioCopyNodes(createCardDocument(), ["time"]);
if (!nestedCopyPlan.ok) throw new Error("unreachable");
const nestedInPlaceDocument = createCardDocument();
const nestedInPlaceIds = applyStudioPasteCopy(
  nestedInPlaceDocument,
  nestedCopyPlan.payload,
  nestedInPlaceDocument.graph.nodes.offlineDay,
  { scopeRootNodeId: "offline", inPlace: true },
);
assert.deepEqual(
  getStyleOf(nestedInPlaceDocument, nestedInPlaceIds[0]),
  { left: 105, top: 206 },
  "묶음 안에서 복사해 다른 깊이에 붙여도 카드 안 같은 자리에 놓는다.",
);

const cutIntoVariantDocument = createCardDocument();
const cutIntoVariantPlan = planStudioPasteCut(
  cutIntoVariantDocument,
  { kind: "cut", rootNodeIds: ["day"], primaryNodeId: "day" },
  "offline",
  "offline",
);
assert.equal(cutIntoVariantPlan.ok, true);
if (!cutIntoVariantPlan.ok) throw new Error("unreachable");
assert.equal(
  cutIntoVariantPlan.position,
  "inside",
  "잘라낸 노드도 카드 variant 루트를 고르면 그 카드 안에 넣는다.",
);
assert.equal(
  applyStudioPasteCut(cutIntoVariantDocument, cutIntoVariantPlan).ok,
  true,
);
assert.deepEqual(cutIntoVariantDocument.graph.nodes.offline.childIds, [
  "offlineDay",
  "day",
]);

// 범위가 없는 편집기에서 문서 루트 노드를 고르면 원본 부모가 아니라 그 뒤에 붙인다.
const rootSelectionDocument = createDocument();
const childCopyPlan = planStudioCopyNodes(rootSelectionDocument, ["child"]);
if (!childCopyPlan.ok) throw new Error("unreachable");
const rootSelectionIds = applyStudioPasteCopy(
  rootSelectionDocument,
  childCopyPlan.payload,
  rootSelectionDocument.graph.nodes.loose,
);
assert.deepEqual(
  rootSelectionDocument.graph.rootNodeIds,
  ["root", "loose", rootSelectionIds[0], "mount"],
  "고른 노드가 문서 루트에 있으면 원본 부모로 돌아가지 않고 그 뒤에 놓는다.",
);
assert.deepEqual(
  getStyleOf(rootSelectionDocument, rootSelectionIds[0]),
  { left: 29, top: 29 },
  "부모가 바뀌어도 캔버스에서 원본 자리에서 밀어낸 곳에 놓는다.",
);

console.log("Studio clipboard command baseline checks passed.");
