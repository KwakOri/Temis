/**
 * 상태 카드 사이 레이어 복사의 기준선 가드.
 *
 * 같은 레이어는 variant sync key와 entry slot으로 찾는다. 있으면 통째로 바꾸고
 * 없으면 원본과 같은 자리에 넣으며, 대상 카드에만 있는 레이어는 남긴다.
 * Multi의 두 칸 규칙도 값으로 고정해 둔다.
 */
import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { getStudioVariantEntryGroups } from "../src/utils/template-studio/entry-groups";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  ensureStudioCapabilityVariant,
  ensureStudioIndependentStatusVariants,
} from "../src/utils/template-studio/status-variants";
import { copyStudioVariantNodes } from "../src/utils/template-studio/variant-node-copy";

const createDocument = () => {
  const document = createSampleStudioDocument();
  ensureStudioIndependentStatusVariants(document);
  ensureStudioCapabilityVariant(document, "multi");
  return document;
};

const getComponent = (document: StudioTemplateDocument) => {
  const component = document.domains?.timetable?.components.defaultEntryCard;
  if (!component) throw new Error("Sample component is missing");
  return component;
};

const getRoot = (document: StudioTemplateDocument, statusId: string) =>
  document.graph.nodes[getComponent(document).variants[statusId].rootNodeId];

const findByLabel = (
  document: StudioTemplateDocument,
  statusId: string,
  label: string,
): StudioGraphNode => {
  const visit = (nodeId: string): StudioGraphNode | null => {
    const node = document.graph.nodes[nodeId];
    if (!node) return null;
    if (node.label === label) return node;
    for (const childId of node.childIds) {
      const found = visit(childId);
      if (found) return found;
    }
    return null;
  };
  const node = getRoot(document, statusId).childIds.map(visit).find(Boolean);
  if (!node) throw new Error(`${statusId} ${label} is missing`);
  return node;
};

const getStyle = (document: StudioTemplateDocument, node: StudioGraphNode) =>
  node.styleId ? document.styles[node.styleId] : {};

const getChildLabels = (document: StudioTemplateDocument, statusId: string) =>
  getRoot(document, statusId).childIds.map(
    (nodeId) => document.graph.nodes[nodeId].label,
  );

const copy = (
  document: StudioTemplateDocument,
  sourceNodeIds: string[],
  targetStatusIds: string[],
  sourceStatusId = "online",
) =>
  copyStudioVariantNodes(document, {
    component: getComponent(document),
    sourceStatusId,
    sourceNodeIds,
    targetStatusIds,
  });

// 같은 레이어가 있으면 내용과 스타일을 통째로 바꾸고 자리는 그대로 둔다.
const replaceDocument = createDocument();
const onlineDate = findByLabel(replaceDocument, "online", "date");
Object.assign(getStyle(replaceDocument, onlineDate), {
  color: "#ff0000",
  left: 300,
});
onlineDate.label = "date edited";
const offlineChildLabelsBefore = getChildLabels(replaceDocument, "offline");
const replaceResult = copy(replaceDocument, [onlineDate.id], ["offline"]);
assert.equal(replaceResult.replacedNodeCount, 1);
assert.equal(replaceResult.addedNodeCount, 0);
assert.deepEqual(replaceResult.copiedStatusIds, ["offline"]);
const offlineDate = findByLabel(replaceDocument, "offline", "date edited");
assert.notEqual(offlineDate.id, onlineDate.id, "복사본은 새 id를 받는다.");
assert.equal(getStyle(replaceDocument, offlineDate).color, "#ff0000");
assert.equal(getStyle(replaceDocument, offlineDate).left, 300);
assert.deepEqual(
  getChildLabels(replaceDocument, "offline"),
  offlineChildLabelsBefore.map((label) =>
    label === "date" ? "date edited" : label,
  ),
  "바꾼 레이어는 원래 겹침 순서 자리에 놓인다.",
);
assert.equal(
  findByLabel(replaceDocument, "multi", "date").label,
  "date",
  "고르지 않은 상태는 건드리지 않는다.",
);

// 대상에 없는 레이어는 원본 형제 옆, 같은 겹침 순서 자리에 넣는다.
const addDocument = createDocument();
const offlineDay = findByLabel(addDocument, "offline", "day");
getRoot(addDocument, "offline").childIds = getRoot(
  addDocument,
  "offline",
).childIds.filter((nodeId) => nodeId !== offlineDay.id);
delete addDocument.graph.nodes[offlineDay.id];
const addResult = copy(
  addDocument,
  [findByLabel(addDocument, "online", "day").id],
  ["offline"],
);
assert.equal(addResult.addedNodeCount, 1);
assert.deepEqual(
  getChildLabels(addDocument, "offline"),
  getChildLabels(addDocument, "online"),
);

// 카드 루트를 고르면 루트 스타일과 모든 자식을 복사하고 대상에만 있는 레이어는 남긴다.
const wholeDocument = createDocument();
const onlineRoot = getRoot(wholeDocument, "online");
getStyle(wholeDocument, onlineRoot).backgroundColor = "#123456";
Object.assign(
  getStyle(wholeDocument, findByLabel(wholeDocument, "online", "background")),
  { width: 500, height: 500 },
);
const offlineOnlyId = "node_offline_only";
wholeDocument.graph.nodes[offlineOnlyId] = {
  id: offlineOnlyId,
  type: "text",
  label: "offline only",
  parentId: getRoot(wholeDocument, "offline").id,
  childIds: [],
  binding: { kind: "staticText", value: "휴방" },
};
getRoot(wholeDocument, "offline").childIds.push(offlineOnlyId);
const wholeResult = copy(wholeDocument, [onlineRoot.id], ["offline"]);
assert.equal(wholeResult.replacedNodeCount, 4);
assert.equal(
  getStyle(wholeDocument, getRoot(wholeDocument, "offline")).backgroundColor,
  "#123456",
);
assert.deepEqual(
  getStyle(wholeDocument, getRoot(wholeDocument, "offline")).left,
  getComponent(wholeDocument).frame?.left,
  "루트 위치와 크기는 공유 frame을 따른다.",
);
assert.equal(
  getStyle(wholeDocument, findByLabel(wholeDocument, "offline", "background"))
    .width,
  500,
);
assert.equal(
  findByLabel(wholeDocument, "offline", "offline only").id,
  offlineOnlyId,
  "대상 카드에만 있는 레이어는 남긴다.",
);
assert.equal(
  getRoot(wholeDocument, "offline").label,
  "Template Card offline",
  "대상 카드 루트 이름은 바꾸지 않는다.",
);

// Multi로 Entry Group을 보내면 두 칸을 다시 나눈다.
const multiDocument = createDocument();
const onlineEntryGroup = findByLabel(multiDocument, "online", "Entry Group 1");
Object.assign(
  getStyle(multiDocument, findByLabel(multiDocument, "online", "main_title")),
  { fontSize: 100 },
);
const multiResult = copy(multiDocument, [onlineEntryGroup.id], ["multi"]);
assert.equal(multiResult.replacedNodeCount, 1);
const multiGroups = getStudioVariantEntryGroups(
  multiDocument,
  getComponent(multiDocument).variants.multi,
);
assert.deepEqual(
  multiGroups.map((group) => group.meta?.entrySlot?.index),
  [0, 1],
);
assert.ok(
  multiGroups.every(
    (group) => Number(getStyle(multiDocument, group).height) < 600,
  ),
  "두 칸 모두 반 높이로 나뉜다.",
);
const multiMainTitles = multiGroups.map((group) =>
  group.childIds
    .map((nodeId) => multiDocument.graph.nodes[nodeId])
    .find((node) => node.label === "main_title"),
);
assert.ok(
  multiMainTitles.every(
    (node) => node && Number(getStyle(multiDocument, node).fontSize) === 48,
  ),
  "글자 크기도 칸 높이 비율로 줄인다.",
);

// Entry Group 안 레이어 하나만 Multi로 보내면 칸 크기가 맞지 않아 건너뛴다.
const multiChildDocument = createDocument();
const multiChildResult = copy(
  multiChildDocument,
  [findByLabel(multiChildDocument, "online", "main_title").id],
  ["multi", "offline"],
);
assert.equal(multiChildResult.skippedNodeCount, 1);
assert.deepEqual(multiChildResult.copiedStatusIds, ["offline"]);
assert.deepEqual(multiChildResult.skippedStatusIds, ["multi"]);

// Multi의 두 번째 칸은 칸이 하나인 상태로 보내지 않는다.
const multiSourceDocument = createDocument();
const multiSourceResult = copy(
  multiSourceDocument,
  [getRoot(multiSourceDocument, "multi").id],
  ["online"],
  "multi",
);
assert.equal(multiSourceResult.skippedNodeCount, 1);
assert.equal(
  getStudioVariantEntryGroups(
    multiSourceDocument,
    getComponent(multiSourceDocument).variants.online,
  ).length,
  1,
);

console.log("Studio variant node copy baseline checks passed.");
