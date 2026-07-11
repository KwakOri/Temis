import assert from "node:assert/strict";

import type {
  StudioTemplateDocument,
  StudioTimetableComposition,
} from "../src/types/template-studio";
import {
  getStudioObjectRenderStyle,
  resolveStudioGraphNodeGeometry,
  resolveStudioTimetableObjectGeometry,
} from "../src/utils/template-studio/object-layout";

const document = {
  canvas: { width: 1200, height: 800, background: "#fff" },
  graph: {
    rootNodeIds: ["root"],
    nodes: {
      root: {
        id: "root",
        type: "group",
        label: "Root",
        parentId: null,
        childIds: ["child"],
        styleId: "root-style",
        layoutMode: "fillParent",
      },
      child: {
        id: "child",
        type: "image",
        label: "Child",
        parentId: "root",
        childIds: [],
        styleId: "child-style",
        layoutMode: "fillParent",
      },
    },
  },
  styles: {
    "root-style": { left: 100, top: 100, width: 300, height: 200 },
    "child-style": { left: 20, top: 30, width: 80, height: 90 },
  },
  inputs: {},
  assets: {},
} as unknown as StudioTemplateDocument;

assert.deepEqual(resolveStudioGraphNodeGeometry(document, "root"), {
  left: 0,
  top: 0,
  width: 1200,
  height: 800,
});
assert.deepEqual(resolveStudioGraphNodeGeometry(document, "child"), {
  left: 0,
  top: 0,
  width: 1200,
  height: 800,
});
assert.deepEqual(
  getStudioObjectRenderStyle(document.styles["child-style"], "fillParent"),
  {
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
  },
);

const composition: StudioTimetableComposition = {
  rootObjectIds: ["group"],
  objects: {
    group: {
      id: "group",
      kind: "group",
      label: "Group",
      parentId: null,
      childIds: ["image"],
      layoutMode: "fixed",
      style: { left: 50, top: 60, width: 420, height: 360 },
    },
    image: {
      id: "image",
      kind: "image",
      label: "Image",
      parentId: "group",
      layoutMode: "fillParent",
      style: { left: 10, top: 20, width: 100, height: 100 },
    },
  },
};

assert.deepEqual(
  resolveStudioTimetableObjectGeometry(
    composition,
    "image",
    { width: 4000, height: 2250 },
  ),
  { left: 0, top: 0, width: 420, height: 360 },
);

composition.objects.group.layoutMode = "fillParent";
assert.deepEqual(
  resolveStudioTimetableObjectGeometry(
    composition,
    "image",
    { width: 4000, height: 2250 },
  ),
  { left: 0, top: 0, width: 4000, height: 2250 },
);

console.log("Template Studio object layout checks passed.");
