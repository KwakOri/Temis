import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/app/(root)/template-studio/_components/studio-renderer";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import type {
  StudioGraphNode,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
} from "../src/types/template-studio";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  getStudioTextWrapMode,
  isStudioTextWrapModeMultiline,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
} from "../src/utils/template-studio/text-wrap";
import {
  createStudioStructuredTextPresetObjects,
  ensureStudioStructuredTextFlexibleKind,
  getStudioTimetableComposition,
} from "../src/utils/template-studio/timetable-composition";
import { setStudioTimetableEntryField } from "../src/utils/template-studio/timetable-runtime";

const document = createSampleStudioDocument();
const timetable = document.domains!.timetable!;
const dayId = timetable.dayIds[0];

const mainTitleNode = Object.values(document.graph.nodes).find(
  (node): node is StudioGraphNode =>
    node.type === "flexibleText" && node.label === "main_title",
);
assert.ok(
  mainTitleNode?.styleId,
  "Sample document must author a main_title Auto Text node.",
);
const mainTitleStyle = document.styles[mainTitleNode.styleId];

let runtimeValues = createStudioInitialRuntimeValues(document);
runtimeValues = setStudioTimetableEntryField(
  document,
  runtimeValues,
  dayId,
  0,
  "mainTitle",
  "First line\nSecond line",
);

const renderCards = () =>
  renderToStaticMarkup(
    <StudioRenderer document={document} runtimeValues={runtimeValues} />,
  );

// 저장된 값이 없으면 기존 동작(개행 보존)을 유지해야 한다.
assert.equal(getStudioTextWrapMode(mainTitleStyle), "preserve");
assert.equal(isStudioTextWrapModeMultiline("preserve"), true);
const preserveMarkup = renderCards();
assert.match(
  preserveMarkup,
  /white-space:pre/,
  "Auto Text must preserve authored line breaks by default.",
);

// `single`로 바꾸면 한 줄로 렌더된다.
mainTitleStyle[STUDIO_TEXT_WRAP_MODE_STYLE_KEY] = "single";
assert.equal(getStudioTextWrapMode(mainTitleStyle), "single");
assert.equal(isStudioTextWrapModeMultiline("single"), false);
const singleLineMarkup = renderCards();
assert.match(
  singleLineMarkup,
  /white-space:nowrap/,
  "Single line mode must disable line breaks in rendered Auto Text.",
);

// 렌더 옵션이므로 CSS 선언으로 흘러나가면 안 된다.
assert.doesNotMatch(
  singleLineMarkup,
  new RegExp(`${STUDIO_TEXT_WRAP_MODE_STYLE_KEY}:`, "i"),
  "The line break mode must not leak into inline CSS.",
);
assert.doesNotMatch(
  singleLineMarkup,
  /text-wrap-mode:/i,
  "The line break mode must not leak into inline CSS.",
);

// 알 수 없는 값은 기존 동작으로 떨어진다.
mainTitleStyle[STUDIO_TEXT_WRAP_MODE_STYLE_KEY] = "unexpected-value";
assert.equal(getStudioTextWrapMode(mainTitleStyle), "preserve");

// --- Timetable composition: 구조화 텍스트 프리셋도 Auto Text여야 한다 ---

const getStructuredTextObjects = (
  objects: StudioTimetableCompositionObject[],
) => objects.filter((object) => object.structuredRole === "text");

(["artistProfileText", "weeklyMemo"] as const).forEach((presetId) => {
  const created = createStudioStructuredTextPresetObjects(presetId, {
    rootObjectIds: [],
    objects: {},
  });
  const textObjects = getStructuredTextObjects(created.children);
  assert.ok(
    textObjects.length > 0,
    `${presetId} must create structured text objects.`,
  );
  textObjects.forEach((object) => {
    assert.equal(
      object.kind,
      "flexibleText",
      `${presetId} text objects must be authored as Auto Text.`,
    );
  });
});

// 이미 고정 크기 text로 저장된 문서는 마이그레이션에서 올라간다.
const legacyComposition: StudioTimetableComposition = (() => {
  const created = createStudioStructuredTextPresetObjects("artistProfileText", {
    rootObjectIds: [],
    objects: {},
  });
  const objects = Object.fromEntries(
    [created.group, ...created.children].map((object) => [object.id, object]),
  );
  getStructuredTextObjects(Object.values(objects)).forEach((object) => {
    object.kind = "text";
  });
  return { rootObjectIds: [created.group.id], objects };
})();

const legacyTextObjects = getStructuredTextObjects(
  Object.values(legacyComposition.objects),
);
assert.ok(legacyTextObjects.every((object) => object.kind === "text"));
const upgradeWarnings =
  ensureStudioStructuredTextFlexibleKind(legacyComposition);
assert.equal(upgradeWarnings.length, 1, "Upgrades must be reported once.");
assert.match(upgradeWarnings[0], /Artist/);
legacyTextObjects.forEach((object) => {
  assert.equal(
    object.kind,
    "flexibleText",
    "Stored structured text objects must be upgraded to Auto Text.",
  );
});
assert.deepEqual(
  ensureStudioStructuredTextFlexibleKind(legacyComposition),
  [],
  "A second migration pass must be a no-op.",
);

// 구조화 텍스트가 아닌 오브젝트는 건드리지 않는다.
const unrelatedComposition: StudioTimetableComposition = {
  rootObjectIds: ["plain"],
  objects: {
    plain: {
      id: "plain",
      kind: "text",
      label: "plain_text",
      structuredRole: "text",
      style: {},
      binding: { kind: "staticText", value: "Plain" },
    },
  },
};
assert.deepEqual(
  ensureStudioStructuredTextFlexibleKind(unrelatedComposition),
  [],
);
assert.equal(unrelatedComposition.objects.plain.kind, "text");

// composition 렌더 경로도 같은 줄바꿈 모드를 따른다.
const compositionDocument = createSampleStudioDocument();
const compositionTimetable = compositionDocument.domains!.timetable!;
const composition = getStudioTimetableComposition(compositionTimetable);
const artistObjects = createStudioStructuredTextPresetObjects(
  "artistProfileText",
  composition,
);
[artistObjects.group, ...artistObjects.children].forEach((object) => {
  composition.objects[object.id] = object;
});
composition.rootObjectIds.push(artistObjects.group.id);
compositionTimetable.composition = composition;

const artistTextObject = getStructuredTextObjects(artistObjects.children)[0];
artistTextObject.binding = {
  kind: "staticText",
  value: "Artist line\nSecond line",
};

const renderTimetable = () =>
  renderToStaticMarkup(
    <StudioTimetablePreview
      document={compositionDocument}
      runtimeValues={createStudioInitialRuntimeValues(compositionDocument)}
    />,
  );

assert.match(
  renderTimetable(),
  /white-space:pre/,
  "Composition Auto Text must preserve line breaks by default.",
);

[artistObjects.group, ...artistObjects.children].forEach((object) => {
  if (object.structuredRole !== "text") return;
  object.style[STUDIO_TEXT_WRAP_MODE_STYLE_KEY] = "single";
});
const compositionSingleMarkup = renderTimetable();
assert.doesNotMatch(
  compositionSingleMarkup,
  new RegExp(`${STUDIO_TEXT_WRAP_MODE_STYLE_KEY}:`, "i"),
  "The composition line break mode must not leak into inline CSS.",
);
assert.match(
  compositionSingleMarkup,
  /white-space:nowrap/,
  "Composition Auto Text must honor single line mode.",
);

console.log("Template Studio Auto Text line break checks passed.");
