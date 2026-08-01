import assert from "node:assert/strict";

import type { StudioTextAppearance } from "../src/types/template-studio";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const appearance: StudioTextAppearance = {
  fill: { type: "solid", color: "#ffffff", opacity: 1 },
  strokes: Array.from({ length: 9 }, (_, index) => ({
    id: `stroke-${index}`,
    enabled: true,
    color: "#000000",
    outset: index === 0 ? 65 : 1,
    opacity: index === 1 ? 1.1 : 1,
  })),
};
const document = createThumbnailStudioDocument();
document.graph.rootNodeIds = ["text"];
document.graph.nodes.text = {
  id: "text",
  type: "text",
  label: "Text",
  parentId: null,
  childIds: [],
  styleId: "style",
  textAppearance: appearance,
};
document.styles.style = { color: "#ffffff" };

const diagnostics = validateStudioDocument(document);
assert.ok(
  diagnostics.some(
    (item) => item.id === "text-appearance-invalid:text:strokes-count",
  ),
);
assert.ok(
  diagnostics.some(
    (item) => item.id === "text-appearance-invalid:text:stroke-outset:0",
  ),
);
assert.ok(
  diagnostics.some(
    (item) => item.id === "text-appearance-invalid:text:stroke-opacity:1",
  ),
);

console.log("Studio text validator checks passed.");
