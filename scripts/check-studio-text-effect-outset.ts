import assert from "node:assert/strict";

import type { StudioTextAppearance } from "../src/types/template-studio";
import { getStudioNodeVisualBounds } from "../src/utils/template-studio/graph-nodes";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import {
  getStudioTextEffectOutset,
  getStudioVisualBounds,
} from "../src/utils/template-studio/text-effect-outset";

const appearance = (
  overrides: Partial<StudioTextAppearance> = {},
): StudioTextAppearance => ({
  fill: { type: "solid", color: "#ffffff", opacity: 1 },
  strokes: [],
  ...overrides,
});

const stroke = (outset: number, overrides: Record<string, unknown> = {}) => ({
  id: "stroke",
  enabled: true,
  color: "#111827",
  outset,
  opacity: 1,
  ...overrides,
});

assert.deepEqual(getStudioTextEffectOutset(appearance()), {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

assert.deepEqual(
  getStudioTextEffectOutset(
    appearance({
      strokes: [
        stroke(12, { enabled: false }),
        stroke(Number.NaN, { id: "nan" }),
        stroke(Number.POSITIVE_INFINITY, { id: "infinity" }),
        stroke(-4, { id: "negative" }),
        stroke(7, { id: "zero-opacity", opacity: 0 }),
      ],
      shadow: {
        enabled: false,
        color: "#000000",
        offsetX: 10,
        offsetY: 10,
        blur: 20,
        opacity: 1,
      },
    }),
  ),
  { top: 0, right: 0, bottom: 0, left: 0 },
  "disabled, opacity-zero, negative and non-finite strokes do not expand bounds",
);

assert.deepEqual(
  getStudioTextEffectOutset(
    appearance({ strokes: [stroke(6), stroke(12, { id: "outer" })] }),
  ),
  { top: 12, right: 12, bottom: 12, left: 12 },
  "the largest drawable stroke controls every side",
);

assert.deepEqual(
  getStudioTextEffectOutset(
    appearance({
      shadow: {
        enabled: true,
        color: "#000000",
        offsetX: 10,
        offsetY: -4,
        blur: 18,
        opacity: 1,
      },
    }),
  ),
  { top: 22, right: 28, bottom: 14, left: 8 },
  "positive and negative shadow offsets use directional formula",
);

assert.deepEqual(
  getStudioTextEffectOutset(
    appearance({
      strokes: [stroke(6)],
      shadow: {
        enabled: true,
        color: "#000000",
        offsetX: -10,
        offsetY: 8,
        blur: 4,
        opacity: 0.5,
      },
    }),
  ),
  { top: 6, right: 6, bottom: 18, left: 20 },
  "stroke and shadow outsets accumulate",
);

assert.deepEqual(
  getStudioTextEffectOutset(
    appearance({
      shadow: {
        enabled: true,
        color: "#000000",
        offsetX: Number.POSITIVE_INFINITY,
        offsetY: Number.NaN,
        blur: -10,
        opacity: 1,
      },
    }),
  ),
  { top: 0, right: 0, bottom: 0, left: 0 },
  "invalid shadow directions and blur normalize to zero",
);

const visual = getStudioVisualBounds({
  logicalBounds: { left: 10, top: 20, width: 100, height: 40 },
  appearance: appearance({ strokes: [stroke(5)] }),
});
assert.deepEqual(visual, {
  left: 5,
  top: 15,
  right: 115,
  bottom: 65,
  width: 110,
  height: 50,
});

const rotated = getStudioVisualBounds({
  logicalBounds: { left: 10, top: 20, width: 100, height: 40 },
  appearance: appearance({ strokes: [stroke(5)] }),
  rotateDeg: 90,
});
assert.ok(Math.abs(rotated.width - 50) < 0.000001);
assert.ok(Math.abs(rotated.height - 110) < 0.000001);
assert.ok(Math.abs(rotated.left - 35) < 0.000001);
assert.ok(Math.abs(rotated.top + 15) < 0.000001);

const groupedDocument = createThumbnailStudioDocument();
groupedDocument.graph.rootNodeIds = ["group"];
groupedDocument.graph.nodes.group = {
  id: "group",
  type: "group",
  label: "Group",
  parentId: null,
  childIds: ["child"],
  styleId: "group-style",
};
groupedDocument.graph.nodes.child = {
  id: "child",
  type: "text",
  label: "Child",
  parentId: "group",
  childIds: [],
  styleId: "child-style",
  textAppearance: appearance({ strokes: [stroke(5)] }),
};
groupedDocument.styles["group-style"] = {
  left: 100,
  top: 40,
  width: 200,
  height: 100,
};
groupedDocument.styles["child-style"] = {
  left: 2,
  top: 3,
  width: 80,
  height: 30,
};
assert.deepEqual(getStudioNodeVisualBounds(groupedDocument, "group"), {
  left: 97,
  top: 38,
  right: 300,
  bottom: 140,
  width: 203,
  height: 102,
});

console.log("Studio text effect outset checks passed.");
