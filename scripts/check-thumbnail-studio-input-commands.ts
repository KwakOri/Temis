import assert from "node:assert/strict";

import {
  captureStudioEditorSnapshot,
  createStudioEditorStore,
} from "../src/stores/studio/studio-editor-store";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { applyStudioSelectOptionValue } from "../src/utils/template-studio/input-commands";
import {
  applyThumbnailStudioAddInput,
  applyThumbnailStudioDeleteInput,
  applyThumbnailStudioDuplicateInput,
  applyThumbnailStudioMoveInput,
  applyThumbnailStudioRenameInputGroup,
  applyThumbnailStudioSetInputGroup,
  applyThumbnailStudioUpdateInput,
} from "../src/utils/thumbnail-studio/input-commands";
import {
  createThumbnailStudioPreviewValues,
  resetThumbnailStudioPreviewValues,
  setThumbnailStudioPreviewInputValue,
  syncThumbnailStudioPreviewValues,
} from "../src/utils/thumbnail-studio/input-preview";
import { getThumbnailStudioInputDefinitions } from "../src/utils/thumbnail-studio/input-order";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 7,
    metadata: { editor: "template-studio", kind: "thumbnail", name: "t" },
    canvas: { width: 1280, height: 720, background: "#fff" },
    graph: { rootNodeIds: [], nodes: {} },
    inputs: {
      title: {
        id: "title",
        type: "text",
        scope: "global",
        label: "Title",
        defaultValue: "Default title",
        presentation: { order: 0 },
      },
      image: {
        id: "image",
        type: "image",
        scope: "global",
        label: "Image",
        defaultUrl: "data:image/png;base64,original",
        presentation: { order: 1 },
      },
      legacyEntry: {
        id: "legacyEntry",
        type: "text",
        scope: "entry",
        label: "Legacy entry",
      },
    },
    styles: {},
    assets: {},
    domains: {
      thumbnail: {
        version: 1,
        export: { defaultFormat: "png", transparentBackground: false },
      },
    },
  }) as StudioTemplateDocument;

const document = createDocument();
const added = applyThumbnailStudioAddInput(document, "select");
assert.equal(added.scope, "global");
assert.equal(added.type, "select");
assert.equal(Object.hasOwn(document.inputs, added.id), true);

const updated = applyThumbnailStudioUpdateInput(document, added.id, (input) => {
  input.label = "Choice";
  input.scope = "entry";
  return input;
});
assert.equal(updated?.label, "Choice");
assert.equal(updated?.scope, "global", "Thumbnail commands keep inputs global");
assert.equal(document.inputs[added.id]?.scope, "global");

const duplicate = applyThumbnailStudioDuplicateInput(document, added.id);
assert.ok(duplicate);
assert.notEqual(duplicate?.id, added.id);
assert.equal(duplicate?.scope, "global");
assert.equal(duplicate?.type, "select");
assert.equal(
  document.graph.nodes["missing-node"],
  undefined,
  "Duplicating an input does not create node bindings",
);

assert.equal(
  applyThumbnailStudioSetInputGroup(document, "title", "  Copy  "),
  true,
);
assert.equal(document.inputs.title.presentation?.groupId, "Copy");
assert.equal(
  applyThumbnailStudioRenameInputGroup(document, "Copy", "Content"),
  1,
);
assert.equal(document.inputs.title.presentation?.groupId, "Content");

assert.equal(applyThumbnailStudioMoveInput(document, "image", 0), true);
assert.deepEqual(
  getThumbnailStudioInputDefinitions(document).map((input) => input.id),
  ["image", "title", added.id, duplicate!.id],
  "Moving an input rewrites the full canonical order",
);
assert.deepEqual(
  getThumbnailStudioInputDefinitions(document).map(
    (input) => input.presentation?.order,
  ),
  [0, 1, 2, 3],
);

assert.ok(applyThumbnailStudioDeleteInput(document, duplicate!.id));
assert.equal(document.inputs[duplicate!.id], undefined);
assert.equal(applyThumbnailStudioDeleteInput(document, "legacyEntry"), null);

const previewDocument = createDocument();
const initialPreview = createThumbnailStudioPreviewValues(previewDocument);
assert.deepEqual(initialPreview.global, {
  title: "Default title",
  image: "data:image/png;base64,original",
});

const editedPreview = setThumbnailStudioPreviewInputValue(
  previewDocument,
  initialPreview,
  "title",
  "Session title",
);
assert.equal(editedPreview.global.title, "Session title");
assert.equal(initialPreview.global.title, "Default title");
assert.deepEqual(
  setThumbnailStudioPreviewInputValue(
    previewDocument,
    editedPreview,
    "legacyEntry",
    "ignored",
  ),
  editedPreview,
  "Thumbnail preview only accepts global inputs",
);

const previewAfterAdd = createDocument();
const newInput = applyThumbnailStudioAddInput(previewAfterAdd, "text");
const syncedAfterAdd = syncThumbnailStudioPreviewValues(
  previewAfterAdd,
  editedPreview,
  ["title"],
);
assert.equal(syncedAfterAdd.global.title, "Session title");
assert.equal(
  syncedAfterAdd.global[newInput.id],
  "New value",
  "A new input starts its preview session at the default",
);

const changedDefaultInput = previewAfterAdd.inputs.title;
assert.equal(changedDefaultInput.type, "text");
if (changedDefaultInput.type === "text") {
  changedDefaultInput.defaultValue = "Changed default";
}
const defaultsAfterChange = syncThumbnailStudioPreviewValues(
  previewAfterAdd,
  syncedAfterAdd,
  [],
);
assert.equal(
  defaultsAfterChange.global.title,
  "Changed default",
  "An unedited preview follows the latest document default",
);
const sessionAfterChange = syncThumbnailStudioPreviewValues(
  previewAfterAdd,
  syncedAfterAdd,
  ["title"],
);
assert.equal(
  sessionAfterChange.global.title,
  "Session title",
  "Only an explicitly edited preview preserves its session value",
);

const resetOne = resetThumbnailStudioPreviewValues(
  previewDocument,
  {
    ...editedPreview,
    global: { ...editedPreview.global, image: "session-image" },
  },
  "title",
);
assert.equal(resetOne.global.title, "Default title");
assert.equal(
  resetOne.global.image,
  "session-image",
  "Resetting one preview preserves the other session values",
);
const resetAll = resetThumbnailStudioPreviewValues(
  previewDocument,
  editedPreview,
);
assert.deepEqual(resetAll.global, initialPreview.global);

interface ThumbnailView {
  previewValues: StudioRuntimeValues;
}
const runtimeStore = createStudioEditorStore<ThumbnailView>({
  document: previewDocument,
  runtimeValues: initialPreview,
  view: { previewValues: initialPreview },
});
const historyBeforePreview = captureStudioEditorSnapshot(
  runtimeStore.getState(),
);
runtimeStore.getState().setView({ previewValues: editedPreview });
const historyAfterPreview = captureStudioEditorSnapshot(
  runtimeStore.getState(),
);
assert.deepEqual(
  historyAfterPreview,
  historyBeforePreview,
  "Preview view changes do not enter the document history snapshot",
);

const selectDocument = createDocument();
delete selectDocument.inputs.legacyEntry;
const selectInput = applyThumbnailStudioAddInput(selectDocument, "select");
assert.equal(selectInput.type, "select");
if (selectInput.type === "select") {
  const beforeDuplicate = structuredClone(selectDocument);
  assert.equal(
    applyStudioSelectOptionValue(selectDocument, selectInput.id, 1, "option-a"),
    null,
  );
  assert.deepEqual(
    selectDocument,
    beforeDuplicate,
    "A duplicate select value must not mutate the document",
  );
  assert.equal(
    applyStudioSelectOptionValue(selectDocument, selectInput.id, 1, "   "),
    null,
  );

  selectInput.options[1] = { ...selectInput.options[1], value: "option-a" };
  selectInput.defaultValue = "missing";
  const diagnosticIds = validateStudioDocument(selectDocument).map(
    (diagnostic) => diagnostic.id,
  );
  assert.ok(
    diagnosticIds.includes(`select-option-value-duplicate:${selectInput.id}`),
  );
  assert.ok(
    diagnosticIds.includes(`select-default-value-invalid:${selectInput.id}`),
  );
}

console.log("Thumbnail Studio input command checks passed.");
