import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/app/(root)/template-studio/_components/studio-renderer";
import type { StudioGraphNode } from "../src/types/template-studio";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  getStudioTextWrapMode,
  isStudioTextWrapModeMultiline,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
} from "../src/utils/template-studio/text-wrap";
import { setStudioTimetableEntryField } from "../src/utils/template-studio/timetable-runtime";

const document = createSampleStudioDocument();
const timetable = document.domains!.timetable!;
const dayId = timetable.dayIds[0];

const mainTitleNode = Object.values(document.graph.nodes).find(
  (node): node is StudioGraphNode =>
    node.type === "flexibleText" && node.label === "main_title",
);
assert.ok(mainTitleNode?.styleId, "Sample document must author a main_title Auto Text node.");
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

console.log("Template Studio Auto Text line break checks passed.");
