import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import type { StudioTemplateDocument } from "../src/types/template-studio";
import { createStudioEditorStore } from "../src/stores/studio/studio-editor-store";
import {
  createStudioBindingForInput,
  resolveStudioAsset,
  resolveStudioTextBinding,
} from "../src/utils/template-studio/binding-resolver";
import { captureStudioEditorSnapshot } from "../src/stores/studio/studio-editor-store";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import {
  createThumbnailStudioPreviewValues,
  setThumbnailStudioPreviewInputValue,
} from "../src/utils/thumbnail-studio/input-preview";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const document = createThumbnailStudioDocument() as StudioTemplateDocument;
document.inputs.title = {
  id: "title",
  type: "text",
  scope: "global",
  label: "Title",
  defaultValue: "Default title",
};
document.inputs.photo = {
  id: "photo",
  type: "image",
  scope: "global",
  label: "Photo",
  defaultUrl: "data:image/png;base64,default",
  policy: {
    allowFitChange: true,
    allowFocusChange: false,
    allowReplace: true,
    allowCrop: false,
    recommendedAspectRatio: 16 / 9,
  },
};
document.styles.titleStyle = {
  left: 20,
  top: 20,
  width: 300,
  height: 80,
  fontSize: 32,
};
document.styles.photoStyle = {
  left: 20,
  top: 120,
  width: 320,
  height: 180,
  objectPosition: "25% 75%",
  borderRadius: 12,
};
document.graph.rootNodeIds = ["titleNode", "photoNode"];
document.graph.nodes.titleNode = {
  id: "titleNode",
  type: "text",
  label: "Title node",
  parentId: null,
  childIds: [],
  styleId: "titleStyle",
  binding: { kind: "inputText", inputId: "title" },
};
document.graph.nodes.photoNode = {
  id: "photoNode",
  type: "image",
  label: "Photo node",
  parentId: null,
  childIds: [],
  styleId: "photoStyle",
  fit: "contain",
  binding: { kind: "inputImage", inputId: "photo" },
};

assert.deepEqual(
  createStudioBindingForInput(
    document.graph.nodes.photoNode,
    document.inputs.photo,
  ),
  {
    kind: "inputImage",
    inputId: "photo",
  },
);

let previewValues = createThumbnailStudioPreviewValues(document);
previewValues = setThumbnailStudioPreviewInputValue(
  document,
  previewValues,
  "title",
  "Runtime title",
);
previewValues = setThumbnailStudioPreviewInputValue(
  document,
  previewValues,
  "photo",
  "data:image/png;base64,runtime",
);

assert.equal(
  resolveStudioTextBinding(
    document,
    previewValues,
    document.graph.nodes.titleNode.binding,
  ),
  "Runtime title",
);
assert.deepEqual(
  resolveStudioAsset(
    document,
    previewValues,
    document.graph.nodes.photoNode.binding,
  ),
  {
    id: "runtime:photo",
    label: "Photo",
    src: "data:image/png;base64,runtime",
  },
);

const rendererMarkup = renderToStaticMarkup(
  <StudioRenderer document={document} runtimeValues={previewValues} />,
);
assert.ok(rendererMarkup.includes("Runtime title"));
assert.ok(rendererMarkup.includes('src="data:image/png;base64,runtime"'));
assert.ok(rendererMarkup.includes("object-fit:contain"));
assert.ok(rendererMarkup.includes("object-position:25% 75%"));

const diagnostics = validateStudioDocument(document);
assert.equal(
  diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  0,
  "The handoff document must remain validator-clean",
);

const store = createStudioEditorStore({
  document,
  runtimeValues: previewValues,
  view: { previewValues },
});
const historyBeforePreview = captureStudioEditorSnapshot(store.getState());
store.getState().setView({
  previewValues: {
    ...previewValues,
    global: { ...previewValues.global, title: "Another preview" },
  },
});
assert.deepEqual(
  captureStudioEditorSnapshot(store.getState()),
  historyBeforePreview,
  "Preview changes must stay outside the document history handoff",
);

console.log("Thumbnail Studio integration checks passed.");
