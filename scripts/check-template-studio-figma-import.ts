import assert from "node:assert/strict";
import type { FigmaNormalizedNode } from "../src/types/template-studio-figma";
import { parseFigmaDesignUrl } from "../src/utils/template-studio/figma-import/figma-url";

const validUrl =
  "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=1412-5814";

assert.deepEqual(parseFigmaDesignUrl(validUrl), {
  fileKey: "T2VDXkMPVFa6yEl9FnVvYo",
  nodeId: "1412:5814",
});
assert.deepEqual(
  parseFigmaDesignUrl(
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=12-34",
  ),
  { fileKey: "T2VDXkMPVFa6yEl9FnVvYo", nodeId: "12:34" },
);
assert.equal(
  parseFigmaDesignUrl("https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid"),
  null,
);
assert.equal(
  parseFigmaDesignUrl("https://www.figma.com/file/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=1-2"),
  null,
);
assert.equal(
  parseFigmaDesignUrl("https://www.figma.com/design/file/name?node-id=1-2"),
  null,
);

const metadataContract: FigmaNormalizedNode = {
  id: "1:2",
  name: "Title",
  type: "TEXT",
  textAutoResize: "WIDTH_AND_HEIGHT",
  layoutSizingHorizontal: "HUG",
  rotation: -13.5,
  rotatedWidth: 160,
  rotatedHeight: 100,
};
assert.equal(metadataContract.rotation, -13.5);
assert.equal(metadataContract.textAutoResize, "WIDTH_AND_HEIGHT");

console.log("Figma import contract checks passed");
