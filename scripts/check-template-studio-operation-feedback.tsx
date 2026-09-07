import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioOperationFeedback } from "../src/components/studio/editor-shell/studio-operation-feedback";

const markup = renderToStaticMarkup(
  <StudioOperationFeedback
    operation={{ operation: "load", stage: "loading" }}
    toast={{ tone: "error", message: "Database load failed" }}
    onDismissToast={() => {}}
  />,
);

assert.ok(markup.includes("템플릿 불러오기"));
assert.ok(markup.includes("저장된 템플릿을 불러오는 중"));
assert.ok(markup.includes('role="dialog"'));
assert.ok(markup.includes("Database load failed"));

console.log("Template Studio operation feedback checks passed.");
