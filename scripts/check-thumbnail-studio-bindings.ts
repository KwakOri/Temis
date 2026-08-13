import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  applyThumbnailStudioBindNodeToInput,
  applyThumbnailStudioCreateInputForNode,
  applyThumbnailStudioDeleteInputWithMaterialize,
  applyThumbnailStudioMaterializeNodeBinding,
  applyThumbnailStudioRestoreNodeBindingFallback,
  applyThumbnailStudioSetSelectAssetMapping,
  applyThumbnailStudioSetSelectTextOutput,
} from "../src/utils/thumbnail-studio/binding-commands";
import { collectThumbnailStudioInputConsumers } from "../src/utils/thumbnail-studio/input-consumers";
import { createThumbnailStudioPreviewValues } from "../src/utils/thumbnail-studio/input-preview";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const makeNode = (
  id: string,
  type: "text" | "image",
  binding: StudioGraphNode["binding"],
  locked = false,
): StudioGraphNode => ({
  id,
  type,
  label: id,
  parentId: null,
  childIds: [],
  binding,
  locked,
});

const document = createThumbnailStudioDocument() as StudioTemplateDocument;
document.inputs = {
  title: {
    id: "title",
    type: "text",
    scope: "global",
    label: "Title",
    defaultValue: "Default title",
  },
  choice: {
    id: "choice",
    type: "select",
    scope: "global",
    label: "Choice",
    defaultValue: "a",
    options: [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ],
  },
  photo: {
    id: "photo",
    type: "image",
    scope: "global",
    label: "Photo",
    defaultUrl: "https://example.com/preview.png",
  },
};
document.assets = {
  hero: { id: "hero", label: "Hero", src: "https://example.com/hero.png" },
};
document.graph.rootNodeIds = ["titleNode", "imageNode", "choiceNode"];
document.graph.nodes = {
  titleNode: makeNode("titleNode", "text", {
    kind: "staticText",
    value: "Original title",
  }),
  imageNode: makeNode("imageNode", "image", {
    kind: "staticAsset",
    assetId: "hero",
  }),
  choiceNode: makeNode("choiceNode", "text", {
    kind: "staticText",
    value: "Choice",
  }),
};

assert.equal(
  applyThumbnailStudioBindNodeToInput(document, "titleNode", "title"),
  true,
);
assert.deepEqual(document.graph.nodes.titleNode.meta?.bindingFallback, {
  kind: "staticText",
  value: "Original title",
});
assert.deepEqual(document.graph.nodes.titleNode.binding, {
  kind: "inputText",
  inputId: "title",
});

const values = createThumbnailStudioPreviewValues(document);
values.global.title = "Preview title";
assert.equal(
  applyThumbnailStudioMaterializeNodeBinding(document, values, "titleNode"),
  true,
);
assert.deepEqual(document.graph.nodes.titleNode.binding, {
  kind: "staticText",
  value: "Preview title",
});

const invalidFallbackDocument = structuredClone(document);
invalidFallbackDocument.graph.nodes.titleNode.meta = {
  bindingFallback: { kind: "staticAsset", assetId: "hero" },
};
assert.ok(
  validateStudioDocument(invalidFallbackDocument).some(
    (diagnostic) => diagnostic.id === "binding-fallback-node-type:titleNode",
  ),
);

const createdInputId = applyThumbnailStudioCreateInputForNode(
  document,
  values,
  "titleNode",
);
assert.ok(createdInputId);
assert.equal(document.inputs[createdInputId!]?.type, "text");
const createdInput = document.inputs[createdInputId!];
assert.equal(
  createdInput?.type === "text" ? createdInput.defaultValue : undefined,
  "Preview title",
);
assert.deepEqual(document.graph.nodes.titleNode.binding, {
  kind: "inputText",
  inputId: createdInputId,
});
assert.deepEqual(document.graph.nodes.titleNode.meta?.bindingFallback, {
  kind: "staticText",
  value: "Preview title",
});

assert.equal(
  applyThumbnailStudioDeleteInputWithMaterialize(
    document,
    values,
    createdInputId!,
  ),
  true,
);
assert.equal(document.inputs[createdInputId!], undefined);
assert.deepEqual(document.graph.nodes.titleNode.binding, {
  kind: "staticText",
  value: "Preview title",
});

assert.equal(
  applyThumbnailStudioBindNodeToInput(document, "titleNode", "title"),
  true,
);
assert.equal(
  applyThumbnailStudioRestoreNodeBindingFallback(document, "titleNode"),
  true,
);
assert.deepEqual(document.graph.nodes.titleNode.binding, {
  kind: "staticText",
  value: "Preview title",
});

assert.equal(
  applyThumbnailStudioBindNodeToInput(document, "choiceNode", "choice"),
  true,
);
assert.equal(
  applyThumbnailStudioSetSelectTextOutput(document, "choiceNode", "value"),
  true,
);
assert.equal(
  (document.graph.nodes.choiceNode.binding as { output: string }).output,
  "value",
);

assert.equal(
  applyThumbnailStudioBindNodeToInput(document, "imageNode", "photo"),
  true,
);
values.global.photo = "https://example.com/session.png";
assert.equal(
  applyThumbnailStudioMaterializeNodeBinding(document, values, "imageNode"),
  true,
);
const materializedAssetId = (
  document.graph.nodes.imageNode.binding as { assetId: string }
).assetId;
assert.ok(document.assets[materializedAssetId]);
assert.equal(
  document.assets[materializedAssetId]?.src,
  "https://example.com/session.png",
);

assert.equal(
  applyThumbnailStudioBindNodeToInput(document, "imageNode", "choice"),
  true,
);
assert.equal(
  applyThumbnailStudioSetSelectAssetMapping(document, "imageNode", "a", "hero"),
  true,
);
assert.equal(
  (
    document.graph.nodes.imageNode.binding as {
      assetByOption: Record<string, string | null>;
    }
  ).assetByOption.a,
  "hero",
);

const consumers = collectThumbnailStudioInputConsumers(document);
assert.equal(consumers.title?.length, undefined);
assert.equal(consumers.choice?.length, 2);
assert.equal(consumers.image?.length, undefined);

const lockedDeleteDocument = structuredClone(document);
lockedDeleteDocument.graph.nodes.choiceNode.locked = true;
assert.equal(
  applyThumbnailStudioDeleteInputWithMaterialize(
    lockedDeleteDocument,
    values,
    "choice",
  ),
  false,
);
assert.ok(lockedDeleteDocument.inputs.choice);

const fallbackDeleteDocument = structuredClone(document);
fallbackDeleteDocument.graph.nodes.imageNode.binding = {
  kind: "staticAsset",
  assetId: "hero",
};
fallbackDeleteDocument.graph.nodes.imageNode.meta = undefined;
assert.equal(
  applyThumbnailStudioBindNodeToInput(
    fallbackDeleteDocument,
    "imageNode",
    "choice",
  ),
  true,
);
assert.equal(
  applyThumbnailStudioDeleteInputWithMaterialize(
    fallbackDeleteDocument,
    createThumbnailStudioPreviewValues(fallbackDeleteDocument),
    "choice",
  ),
  true,
  "An unmapped select asset restores its valid static fallback",
);
assert.deepEqual(fallbackDeleteDocument.graph.nodes.imageNode.binding, {
  kind: "staticAsset",
  assetId: "hero",
});

const atomicDeleteDocument = structuredClone(document);
atomicDeleteDocument.graph.nodes.imageNode.binding = {
  kind: "selectAsset",
  inputId: "choice",
  assetByOption: { a: null, b: null },
};
atomicDeleteDocument.graph.nodes.imageNode.meta = undefined;
const atomicBefore = structuredClone(atomicDeleteDocument);
assert.equal(
  applyThumbnailStudioDeleteInputWithMaterialize(
    atomicDeleteDocument,
    createThumbnailStudioPreviewValues(atomicDeleteDocument),
    "choice",
  ),
  false,
);
assert.deepEqual(
  atomicDeleteDocument,
  atomicBefore,
  "A failed consumer materialization leaves the whole document unchanged",
);

const slotDeleteDocument = structuredClone(document);
slotDeleteDocument.graph.nodes.imageNode.binding = {
  kind: "staticAsset",
  assetId: "hero",
};
slotDeleteDocument.graph.nodes.imageNode.assetSlots = {
  foreground: { inputId: "photo", fit: "cover" },
};
const slotValues = createThumbnailStudioPreviewValues(slotDeleteDocument);
assert.equal(
  applyThumbnailStudioDeleteInputWithMaterialize(
    slotDeleteDocument,
    slotValues,
    "photo",
  ),
  true,
);
const materializedSlot =
  slotDeleteDocument.graph.nodes.imageNode.assetSlots?.foreground;
assert.equal(materializedSlot?.inputId, undefined);
assert.ok(materializedSlot?.assetId);
assert.equal(
  slotDeleteDocument.assets[materializedSlot!.assetId!]?.src,
  "https://example.com/preview.png",
);

console.log("Thumbnail Studio binding checks passed.");
