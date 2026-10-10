import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import { StudioTextTypographyControls } from "../src/components/studio/inspector/studio-text-typography-controls";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { createStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { getStudioDefaultNodeStyle } from "../src/utils/template-studio/node-commands";
import { applyStudioNodeStyleValue } from "../src/utils/template-studio/node-style-commands";

const document = createStudioTimetableGraphDocument();
document.graph.nodes.alignment = {
  id: "alignment",
  label: "Auto Text",
  type: "flexibleText",
  parentId: null,
  childIds: [],
  styleId: "alignment",
  binding: { kind: "staticText", value: "A long auto-fit title" },
};
document.domains.timetable.rootNodeIds = ["alignment"];
document.domains.timetable.nodeExtensions.alignment = {};
const runtimeValues = createStudioInitialRuntimeValues(document);
const noop = () => {};

assert.equal(getStudioDefaultNodeStyle("flexibleText").alignItems, "center");

for (const alignment of [
  undefined,
  "flex-start",
  "center",
  "flex-end",
] as const) {
  document.styles.alignment = {
    width: 200,
    height: 100,
    fontSize: 40,
    textAlign: "left",
    alignItems: alignment,
  };
  const expected = alignment ?? "center";
  for (const component of [
    <StudioRenderer
      document={document}
      runtimeValues={runtimeValues}
      rootNodeIds={["alignment"]}
    />,
    <StudioTimetablePreview
      document={document}
      runtimeValues={runtimeValues}
      locale="ko"
    />,
  ]) {
    const markup = renderToStaticMarkup(component);
    const style = markup.match(
      /data-node-id="alignment"[^>]*style="([^"]+)"/,
    )?.[1];
    assert.ok(style?.includes("display:flex"));
    assert.ok(
      style?.includes(`align-items:${expected}`),
      "카드와 시간표는 같은 세로 정렬과 기본값을 쓴다.",
    );
  }
  const controls = renderToStaticMarkup(
    <StudioTextTypographyControls
      document={document}
      style={document.styles.alignment}
      flexibleText
      fontFamilies={[]}
      colorLabel="Text color"
      onUpdateStyle={noop}
      onUpdateTextAlignment={noop}
    />,
  );
  const label =
    expected === "flex-start"
      ? "Align top"
      : expected === "flex-end"
        ? "Align bottom"
        : "Align middle";
  assert.ok(controls.includes(`aria-label="${label}" aria-pressed="true"`));
}

applyStudioNodeStyleValue(
  document,
  document.graph.nodes.alignment,
  "alignItems",
  "flex-end",
);
const saved = JSON.parse(JSON.stringify(document));
assert.equal(
  saved.styles.alignment.alignItems,
  "flex-end",
  "정렬은 기존 문서 스타일에 저장된다.",
);
assert.equal(
  saved.styles.alignment.textAlign,
  "left",
  "세로 정렬을 바꿔도 가로 정렬은 보존된다.",
);

const normalControls = renderToStaticMarkup(
  <StudioTextTypographyControls
    document={document}
    style={{}}
    flexibleText={false}
    fontFamilies={[]}
    colorLabel="Text color"
    onUpdateStyle={noop}
    onUpdateTextAlignment={noop}
  />,
);
assert.ok(!normalControls.includes("Vertical Alignment"));
console.log("Studio auto text alignment checks passed");
