/**
 * 입력 텍스트 틀의 기준선 가드.
 *
 * 입력값은 `${value}` 자리에 들어가고, 입력값이 비면 틀의 고정 글자도 함께
 * 비운다. 입력값만 쓰는 틀은 바인딩에 남기지 않는다.
 */
import assert from "node:assert/strict";

import type { StudioBinding } from "../src/types/template-studio";
import { resolveStudioTextBinding } from "../src/utils/template-studio/binding-resolver";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import {
  applyStudioInputTextTemplate,
  applyStudioInputTextTemplatePatch,
  normalizeStudioInputTextTemplate,
} from "../src/utils/template-studio/input-text-template";
import { ensureStudioArtistProfileTextInput } from "../src/utils/template-studio/preset-inputs";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";

assert.equal(applyStudioInputTextTemplate("곽재훈", "@ ${value}"), "@ 곽재훈");
assert.equal(
  applyStudioInputTextTemplate("곽재훈", "ARTIST\n${ value }"),
  "ARTIST\n곽재훈",
  "줄바꿈과 공백이 들어간 토큰도 읽는다.",
);
assert.equal(
  applyStudioInputTextTemplate("$& $1", "@ ${value}"),
  "@ $& $1",
  "입력값 안의 $ 글자는 치환 규칙으로 읽지 않는다.",
);
assert.equal(
  applyStudioInputTextTemplate("", "@ ${value}"),
  "",
  "입력값이 비면 고정 글자도 비운다.",
);
assert.equal(applyStudioInputTextTemplate("곽재훈"), "곽재훈");

assert.equal(normalizeStudioInputTextTemplate("${value}"), undefined);
assert.equal(normalizeStudioInputTextTemplate("${ value }"), undefined);
assert.equal(normalizeStudioInputTextTemplate(""), undefined);
assert.equal(normalizeStudioInputTextTemplate("@ ${value}"), "@ ${value}");

const target: { binding?: StudioBinding } = {
  binding: { kind: "inputText", inputId: "artist" },
};
applyStudioInputTextTemplatePatch(target, "@ ${value}");
assert.deepEqual(target.binding, {
  kind: "inputText",
  inputId: "artist",
  textTemplate: "@ ${value}",
});
applyStudioInputTextTemplatePatch(target, undefined);
assert.deepEqual(target.binding, { kind: "inputText", inputId: "artist" });

const staticTarget: { binding?: StudioBinding } = {
  binding: { kind: "staticText", value: "고정" },
};
applyStudioInputTextTemplatePatch(staticTarget, "@ ${value}");
assert.deepEqual(staticTarget.binding, { kind: "staticText", value: "고정" });

// 실제 렌더 경로도 틀을 거친다.
const document = createSampleStudioDocument();
const { inputId } = ensureStudioArtistProfileTextInput(document);
const runtimeValues = createStudioInitialRuntimeValues(document);
runtimeValues.global[inputId] = "곽재훈";
const artistBinding: StudioBinding = {
  kind: "inputText",
  inputId,
  textTemplate: "@ ${value}",
};
assert.equal(
  resolveStudioTextBinding(document, runtimeValues, artistBinding),
  "@ 곽재훈",
);
runtimeValues.global[inputId] = "";
assert.equal(
  resolveStudioTextBinding(document, runtimeValues, artistBinding),
  "",
);

console.log("Studio input text template baseline checks passed.");
