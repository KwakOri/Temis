import assert from "node:assert/strict";
import type { FigmaNormalizedNode } from "../src/types/template-studio-figma";
import { parseFigmaDesignUrl } from "../src/utils/template-studio/figma-import/figma-url";
import {
  adjustFigmaRectForCssCenterRotation,
  normalizeFigmaRotation,
} from "../src/utils/template-studio/figma-import/figma-rotation";
import {
  classifyFigmaTextNode,
  normalizeFigmaLayerName,
} from "../src/utils/template-studio/figma-import/figma-text-classifier";

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

assert.equal(normalizeFigmaRotation(undefined), undefined);
assert.equal(normalizeFigmaRotation(0), 0);
assert.equal(normalizeFigmaRotation(Math.PI / 2), 90);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 10,
    top: 20,
    width: 40,
    height: 30,
    rotateDeg: 0,
  }),
  { left: 10, top: 20, width: 40, height: 30 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 31,
    top: 3,
    width: 160,
    height: 100,
    rotateDeg: -13.5,
  }),
  // Controller ruling: 20.29 is intentional. Absolute sine/cosine bounds
  // are the project contract; the brief's literal 19.52 is inconsistent.
  { left: 40.46, top: 20.29, width: 160, height: 100 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 5,
    top: 7,
    width: 20,
    height: 10,
    rotateDeg: 45,
    rotatedWidth: 30,
    rotatedHeight: 25,
  }),
  { left: 10, top: 14.5, width: 20, height: 10 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 5,
    top: 7,
    width: 20,
    height: 10,
    rotateDeg: 45,
  }),
  { left: 5.61, top: 12.61, width: 20, height: 10 },
);

assert.equal(normalizeFigmaLayerName("mainTitle"), "maintitle");
assert.equal(normalizeFigmaLayerName("main_title"), "maintitle");
assert.equal(normalizeFigmaLayerName("main-title"), "maintitle");
assert.equal(normalizeFigmaLayerName("MAIN TITLE"), "maintitle");

const title = classifyFigmaTextNode({ name: "main_title", characters: "A title" });
assert.equal(title.role, "main_title");
assert.equal(title.binding.kind, "builtinField");
if (title.binding.kind === "builtinField") assert.equal(title.binding.fieldId, "entry.main_title");

const camelTitle = classifyFigmaTextNode({ name: "mainTitle", characters: "A title" });
assert.equal(camelTitle.role, "main_title");
assert.equal(camelTitle.studioType, "text");

const subTitle = classifyFigmaTextNode({ name: "sub_title", characters: "Subtitle" });
assert.equal(subTitle.role, "sub_title");
if (subTitle.binding.kind === "builtinField") assert.equal(subTitle.binding.fieldId, "entry.sub_title");

const time = classifyFigmaTextNode({ name: "PM 8:00", characters: "PM 8:00", layoutSizingHorizontal: "FILL" });
assert.equal(time.role, "time");
assert.equal(time.studioType, "text");
if (time.binding.kind === "builtinField") assert.equal(time.binding.fieldId, "entry.time");

const day = classifyFigmaTextNode({ name: "MON", characters: "MON", textAutoResize: "WIDTH_AND_HEIGHT" });
assert.equal(day.role, "day_label");
assert.equal(day.studioType, "text");
if (day.binding.kind === "builtinField") assert.equal(day.binding.fieldId, "day.short_label");

const date = classifyFigmaTextNode({ name: "07", characters: "07", layoutSizingHorizontal: "FILL" });
assert.equal(date.role, "date");
assert.equal(date.studioType, "text");
assert.deepEqual(date.binding, {
  kind: "builtinField",
  fieldId: "day.date",
  dateRangeFormat: "day",
});

const status = classifyFigmaTextNode({ name: "ONLINE", characters: "ONLINE", layoutSizingHorizontal: "FILL" });
assert.equal(status.role, "status_label");
assert.equal(status.studioType, "text");
if (status.binding.kind === "builtinField") assert.equal(status.binding.fieldId, "entry.status_label");

const dynamicTitle = classifyFigmaTextNode({
  name: "title",
  characters: "A long dynamic title",
  textAutoResize: "HEIGHT",
  layoutSizingHorizontal: "FILL",
});
assert.equal(dynamicTitle.role, "main_title");
assert.equal(dynamicTitle.studioType, "flexibleText");

const unknown = classifyFigmaTextNode({ name: "mystery", characters: "Keep me" });
assert.equal(unknown.role, "unknown");
assert.deepEqual(unknown.binding, { kind: "staticText", value: "Keep me" });
assert.match(unknown.reason, /review/i);

console.log("Figma import contract checks passed");
