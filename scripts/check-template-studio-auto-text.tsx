import { createTimetableGraphFixture } from "./helpers/studio-timetable-fixture";
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
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
  createStudioTimetablePresetObject,
  getStudioTimetableComposition,
} from "./helpers/studio-timetable-recipe";
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
  assert.equal(
    textObjects.length,
    2,
    `${presetId} must author an On and an Off text object.`,
  );
  textObjects.forEach((object) => {
    assert.equal(
      object.kind,
      "flexibleText",
      `${presetId} text objects must be authored as Auto Text.`,
    );
  });
  assert.notEqual(
    textObjects[0].style,
    textObjects[1].style,
    `${presetId} On/Off text objects must not share one style record.`,
  );
});

// 단일 오브젝트 생성기는 구조화 프리셋을 만들지 않는다. 구조화 프리셋 ID를
// 넘기는 것은 타입 단계에서 막히므로 여기서는 허용된 ID만 확인한다.
const singleObjectComposition: StudioTimetableComposition = {
  rootObjectIds: [],
  objects: {},
};
(["board", "weekDates"] as const).forEach((presetId) => {
  const object = createStudioTimetablePresetObject(
    presetId,
    singleObjectComposition,
  );
  assert.equal(object.presetId, presetId);
  singleObjectComposition.objects[object.id] = object;
});
assert.equal(singleObjectComposition.objects["board"].kind, "image");
assert.equal(singleObjectComposition.objects["week-dates"].kind, "text");

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
      document={createTimetableGraphFixture(compositionDocument)}
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

// --- 실제 문서 마이그레이션 진입점을 통과하는지 ---


console.log("Template Studio Auto Text line break checks passed.");
