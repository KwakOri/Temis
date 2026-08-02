import assert from "node:assert/strict";

import type { StudioTextEffectPreset } from "../src/utils/thumbnail-studio/text-effect-presets";
import {
  collectThumbnailStudioFontConsumers,
  getThumbnailStudioFontChangeImpacts,
  getThumbnailStudioFontFamilyReferences,
  getThumbnailStudioFontUsageBySource,
} from "../src/utils/thumbnail-studio/font-consumers";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

assert.deepEqual(
  getThumbnailStudioFontFamilyReferences('"Brand Sans", sans-serif'),
  ["Brand Sans", "sans-serif"],
);

const document = createThumbnailStudioDocument();
document.styles.textStyle = { fontFamily: '"Brand Sans", sans-serif' };
document.styles.flexibleStyle = { fontFamily: "Brand Sans" };
document.graph.nodes.text = {
  id: "text",
  type: "text",
  label: "Title",
  parentId: null,
  childIds: [],
  styleId: "textStyle",
};
document.graph.nodes.flexible = {
  id: "flexible",
  type: "flexibleText",
  label: "Subtitle",
  parentId: null,
  childIds: [],
  styleId: "flexibleStyle",
};

const customPreset = {
  id: "custom-brand",
  source: "custom",
  version: 1,
  label: "Brand preset",
  previewText: "Aa",
  typography: { fontFamily: "Brand Sans" },
  appearance: {
    fill: { type: "solid", color: "#ffffff", opacity: 1 },
    strokes: [],
  },
} satisfies StudioTextEffectPreset;
const fontSource = {
  id: "font-brand",
  label: "Brand Sans",
  cssText:
    "@font-face { font-family: 'Brand Sans'; src: url('https://example.com/brand.woff2'); }",
  enabled: true,
};
document.resources = { webFonts: [fontSource] };

const consumers = collectThumbnailStudioFontConsumers(document, [customPreset]);
assert.equal(consumers["brand sans"]?.length, 3);
assert.equal(consumers["sans-serif"]?.length, 1);
assert.deepEqual(
  getThumbnailStudioFontUsageBySource([fontSource], consumers)[fontSource.id],
  [
    "Title · Text node typography",
    "Subtitle · Text node typography",
    "Brand preset · Custom text preset typography",
  ],
);

const disabledImpacts = getThumbnailStudioFontChangeImpacts(
  [fontSource],
  [{ ...fontSource, enabled: false }],
  consumers,
);
assert.equal(disabledImpacts.length, 1);
assert.equal(disabledImpacts[0]?.fontFamily, "Brand Sans");
assert.equal(disabledImpacts[0]?.consumers.length, 3);

const stillAvailable = {
  ...fontSource,
  id: "font-brand-copy",
  label: "Brand Sans copy",
};
assert.deepEqual(
  getThumbnailStudioFontChangeImpacts(
    [fontSource, stillAvailable],
    [stillAvailable],
    consumers,
  ),
  [],
  "Removing one source must not warn while another enabled source keeps the family",
);

document.resources = undefined;
assert.ok(
  validateStudioDocument(document).some(
    (diagnostic) => diagnostic.id === "font-family-fallback:text:brand sans",
  ),
  "A node that keeps a removed font family must expose a fallback diagnostic",
);

console.log("Thumbnail Studio font consumer checks passed.");
