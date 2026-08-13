import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import type { StudioTemplateDocument } from "../src/types/template-studio";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import {
  formatStudioImageObjectPosition,
  getStudioImageBorderRadius,
  getStudioImageObjectPosition,
  parseStudioImageObjectPosition,
} from "../src/utils/thumbnail-studio/image-object-position";

assert.deepEqual(parseStudioImageObjectPosition("120% -10%"), { x: 100, y: 0 });
assert.deepEqual(parseStudioImageObjectPosition("left bottom"), {
  x: 0,
  y: 100,
});
assert.deepEqual(parseStudioImageObjectPosition("not-a-position"), {
  x: 50,
  y: 50,
});
assert.deepEqual(getStudioImageObjectPosition({}), { x: 50, y: 50 });
assert.equal(
  formatStudioImageObjectPosition({ x: 12.345, y: 87.654 }),
  "12.35% 87.65%",
);
assert.equal(
  getStudioImageBorderRadius({ borderRadius: -12 }),
  0,
  "negative image radius must not reach CSS",
);

const document = createThumbnailStudioDocument();
document.graph.rootNodeIds = ["image"];
document.graph.nodes.image = {
  id: "image",
  type: "image",
  label: "Image",
  parentId: null,
  childIds: [],
  styleId: "image-style",
  fit: "contain",
  binding: { kind: "staticAsset", assetId: "asset" },
};
document.styles["image-style"] = {
  left: 10,
  top: 20,
  width: 320,
  height: 180,
  opacity: 0.6,
  objectPosition: "25% 75%",
  borderRadius: 18,
};
document.assets.asset = {
  id: "asset",
  label: "Hero",
  src: "data:image/png;base64,aGVybw==",
};

const markup = renderToStaticMarkup(
  <StudioRenderer
    document={document as StudioTemplateDocument}
    runtimeValues={{
      global: {},
      days: {},
      entries: {},
      timetable: { entriesByDay: {} },
    }}
  />,
);
assert.match(
  markup,
  /<img[^>]*style="[^"]*object-fit:contain;object-position:25% 75%;border-radius:18px[^\"]*"/,
  "fit, focus and radius must be applied to the real image element",
);
assert.match(
  markup,
  /style="[^"]*opacity:0\.6[^"]*"/,
  "image opacity must continue to use the node style contract",
);

console.log("Thumbnail Studio image renderer checks passed.");
