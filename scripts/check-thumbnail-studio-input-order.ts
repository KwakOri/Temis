import assert from "node:assert/strict";

import type { StudioTemplateDocument } from "../src/types/template-studio";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import {
  getThumbnailStudioInputDefinitions,
  getThumbnailStudioInputGroups,
  normalizeThumbnailStudioInputPresentation,
} from "../src/utils/thumbnail-studio/input-order";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 7,
    metadata: { editor: "template-studio", kind: "thumbnail", name: "t" },
    canvas: { width: 1280, height: 720, background: "#fff" },
    graph: { rootNodeIds: [], nodes: {} },
    inputs: {
      zeta: {
        id: "zeta",
        type: "text",
        scope: "global",
        label: "Zeta",
        presentation: { order: 2, groupId: " writers " },
      },
      alpha: {
        id: "alpha",
        type: "text",
        scope: "global",
        label: "Alpha",
        presentation: { order: 1, groupId: "writers" },
      },
      beta: {
        id: "beta",
        type: "image",
        scope: "global",
        label: "Beta",
        presentation: { order: 1, groupId: "" },
      },
      legacyEntry: {
        id: "legacyEntry",
        type: "text",
        scope: "entry",
        label: "Legacy entry input",
      },
      noOrderB: {
        id: "noOrderB",
        type: "text",
        scope: "global",
        label: "No order B",
      },
      noOrderA: {
        id: "noOrderA",
        type: "text",
        scope: "global",
        label: "No order A",
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
assert.deepEqual(
  getThumbnailStudioInputDefinitions(document).map((input) => input.id),
  ["alpha", "beta", "zeta", "noOrderA", "noOrderB"],
  "Thumbnail ordering ignores non-global inputs and breaks ties by id",
);

assert.deepEqual(
  getThumbnailStudioInputGroups(document).map((group) => ({
    groupId: group.groupId,
    inputIds: group.inputs.map((input) => input.id),
    firstInputIndex: group.firstInputIndex,
  })),
  [
    { groupId: "writers", inputIds: ["alpha", "zeta"], firstInputIndex: 0 },
    {
      groupId: null,
      inputIds: ["beta", "noOrderA", "noOrderB"],
      firstInputIndex: 1,
    },
  ],
  "Group order follows the first member in input order and blank group is ungrouped",
);

assert.equal(
  normalizeThumbnailStudioInputPresentation(document),
  true,
  "Input presentation is normalized when it is not canonical",
);
assert.deepEqual(document.inputs.alpha.presentation, {
  order: 0,
  groupId: "writers",
});
assert.deepEqual(document.inputs.beta.presentation, { order: 1 });
assert.deepEqual(document.inputs.zeta.presentation, {
  order: 2,
  groupId: "writers",
});
assert.deepEqual(document.inputs.noOrderA.presentation, { order: 3 });
assert.deepEqual(document.inputs.noOrderB.presentation, { order: 4 });
assert.equal(
  normalizeThumbnailStudioInputPresentation(document),
  false,
  "A second normalization is idempotent",
);

const invalidScopeDiagnostics = validateStudioDocument(createDocument()).filter(
  (diagnostic) => diagnostic.id === "thumbnail-input-scope-invalid:legacyEntry",
);
assert.equal(invalidScopeDiagnostics.length, 1);
assert.equal(invalidScopeDiagnostics[0]?.severity, "error");

const migrationSource = createDocument();
migrationSource.inputs.alpha.presentation = { order: 1, groupId: " writers " };
migrationSource.inputs.beta.presentation = { order: 42, groupId: "" };
const migration = migrateStudioTemplateDocument(migrationSource);
assert.equal(migration.ok, true);
if (migration.ok) {
  assert.ok(
    migration.warnings.includes(
      "Normalized thumbnail input presentation order.",
    ),
  );
  assert.deepEqual(migration.document.inputs.alpha.presentation, {
    order: 0,
    groupId: "writers",
  });
  assert.deepEqual(migration.document.inputs.beta.presentation, { order: 2 });
  assert.deepEqual(migration.document.inputs.noOrderA.presentation, {
    order: 3,
  });
  assert.deepEqual(migration.document.inputs.noOrderB.presentation, {
    order: 4,
  });
}

console.log("Thumbnail Studio input order checks passed.");
