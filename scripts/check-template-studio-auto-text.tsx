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
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import {
  createStudioStructuredTextPresetObjects,
  createStudioTimetablePresetObject,
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

// --- 실제 문서 마이그레이션 진입점을 통과하는지 ---

const PLAIN_TEXT_OBJECT_ID = "plain-text";

const createLegacyArtistDocument = () => {
  const legacyDocument = createSampleStudioDocument();
  const legacyTimetable = legacyDocument.domains!.timetable!;
  const legacyArtistComposition =
    getStudioTimetableComposition(legacyTimetable);
  const created = createStudioStructuredTextPresetObjects(
    "artistProfileText",
    legacyArtistComposition,
  );
  [created.group, ...created.children].forEach((object) => {
    legacyArtistComposition.objects[object.id] = object;
  });
  legacyArtistComposition.rootObjectIds.push(created.group.id);

  // 저장된 구버전 문서를 재현한다: On/Off 텍스트가 모두 고정 크기 text.
  const artistTextIds = getStructuredTextObjects(created.children).map(
    (object) => {
      object.kind = "text";
      return object.id;
    },
  );
  assert.equal(artistTextIds.length, 2);

  // 구조화 프리셋 밖의 텍스트는 승격 대상이 아니다.
  legacyArtistComposition.objects[PLAIN_TEXT_OBJECT_ID] = {
    id: PLAIN_TEXT_OBJECT_ID,
    kind: "text",
    label: "Plain Text",
    structuredRole: "text",
    style: {},
    binding: { kind: "staticText", value: "Plain" },
  };
  legacyArtistComposition.rootObjectIds.push(PLAIN_TEXT_OBJECT_ID);
  legacyTimetable.composition = legacyArtistComposition;

  return { document: legacyDocument, artistTextIds };
};

const isAutoTextUpgradeWarning = (warning: string) =>
  /Upgraded \d+ Artist text object\(s\) to Auto Text\./.test(warning);

const legacyArtist = createLegacyArtistDocument();
const firstMigration = migrateStudioTemplateDocument(legacyArtist.document);
// strict 모드의 assert.equal은 타입도 좁혀주므로 별도 가드가 필요 없다.
assert.equal(firstMigration.ok, true);

const firstMigratedComposition =
  firstMigration.document.domains!.timetable!.composition!;
legacyArtist.artistTextIds.forEach((objectId) => {
  assert.equal(
    firstMigratedComposition.objects[objectId].kind,
    "flexibleText",
    "The real migration entry point must upgrade stored Artist text objects.",
  );
});
assert.equal(
  firstMigratedComposition.objects[PLAIN_TEXT_OBJECT_ID].kind,
  "text",
  "Text objects outside a structured preset must stay untouched.",
);
assert.equal(
  firstMigration.warnings.filter(isAutoTextUpgradeWarning).length,
  1,
  "The Artist upgrade must be reported exactly once.",
);

const secondMigration = migrateStudioTemplateDocument(firstMigration.document);
assert.equal(secondMigration.ok, true);
assert.deepEqual(
  secondMigration.warnings.filter(isAutoTextUpgradeWarning),
  [],
  "A migrated document must not report the upgrade again.",
);

const secondMigratedComposition =
  secondMigration.document.domains!.timetable!.composition!;
legacyArtist.artistTextIds.forEach((objectId) => {
  assert.equal(
    secondMigratedComposition.objects[objectId].kind,
    "flexibleText",
  );
});
assert.equal(
  secondMigratedComposition.objects[PLAIN_TEXT_OBJECT_ID].kind,
  "text",
);

console.log("Template Studio Auto Text line break checks passed.");
