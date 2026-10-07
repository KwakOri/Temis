import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import { StudioTextTypographyControls } from "../src/components/studio/inspector/studio-text-typography-controls";
import { StudioWebFontSettings } from "../src/components/studio/settings/studio-web-font-settings";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { getStudioNodeDefinition } from "../src/utils/template-studio/node-definitions";
import { createStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";
import {
  getStudioCustomFontFamilies,
  getStudioDefaultFontFamily,
  resolveStudioFontFamily,
  setStudioWebFontSources,
} from "../src/utils/template-studio/web-fonts";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { collectThumbnailStudioFontConsumers } from "../src/utils/thumbnail-studio/font-consumers";

// tsx uses classic JSX for modules whose production JSX is compiled by Next.js.
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const source = {
  id: "brand-font",
  label: "Brand fonts",
  enabled: true,
  cssText: ["Brand Sans", "Brand Serif"]
    .map(
      (family) =>
        `@font-face { font-family: '${family}'; src: url('https://example.invalid/font.woff2'); font-weight: 400; }`,
    )
    .join("\n"),
};
const noop = () => {};

for (const createDocument of [
  createThumbnailStudioDocument,
  createStudioTimetableGraphDocument,
]) {
  const document = createDocument();
  const style = getStudioNodeDefinition("text").createDefaultStyle();
  assert.equal(
    getStudioNodeDefinition("flexibleText").createDefaultStyle().fontFamily,
    undefined,
  );
  assert.equal(
    style.fontFamily,
    undefined,
    "New objects must inherit the default dynamically",
  );
  document.styles.fontTestStyle = style;
  document.graph.nodes.fontTest = {
    id: "fontTest",
    label: "Font Test",
    type: "text",
    parentId: null,
    childIds: [],
    styleId: "fontTestStyle",
    binding: { kind: "staticText", value: "Font Test" },
  };
  document.graph.rootNodeIds.push("fontTest");
  const render = () =>
    renderToStaticMarkup(
      <StudioRenderer
        document={document}
        runtimeValues={createStudioInitialRuntimeValues(document)}
        rootNodeIds={["fontTest"]}
      />,
    );
  const inspector = () =>
    renderToStaticMarkup(
      <StudioTextTypographyControls
        document={document}
        style={style}
        fontFamilies={getStudioCustomFontFamilies(document)}
        flexibleText={false}
        colorLabel="Color"
        onUpdateStyle={noop}
        onUpdateTextAlignment={noop}
      />,
    );
  assert.equal(resolveStudioFontFamily(document), "Inter");
  assert.ok(render().includes("font-family:Inter"));
  assert.ok(inspector().includes('<option value="" selected="">none</option>'));
  assert.ok(!inspector().includes('value="Inter"'));

  setStudioWebFontSources(document, [source]);
  assert.equal(
    resolveStudioFontFamily(document),
    "Inter",
    "Adding a source alone must not silently select it",
  );
  document.resources!.defaultFontFamily = "Brand Sans";
  assert.equal(resolveStudioFontFamily(document, ""), "Brand Sans");
  assert.ok(render().includes("font-family:Brand Sans"));
  assert.ok(inspector().includes('<option value="" selected="">none</option>'));
  assert.equal(
    collectThumbnailStudioFontConsumers(document)["brand sans"]?.some(
      (consumer) => consumer.nodeId === "fontTest",
    ),
    true,
  );

  document.resources!.defaultFontFamily = "Brand Serif";
  assert.ok(
    render().includes("font-family:Brand Serif"),
    "Existing inherited text follows changed defaults",
  );
  style.fontFamily = "Brand Sans";
  assert.equal(
    resolveStudioFontFamily(document, style.fontFamily),
    "Brand Sans",
  );
  assert.ok(
    render().includes("font-family:Brand Sans"),
    "Individual selection overrides document default",
  );
  style.fontFamily = undefined;
  assert.ok(
    render().includes("font-family:Brand Serif"),
    "Clearing individual selection restores inheritance",
  );

  const restored = migrateStudioTemplateDocument(
    JSON.parse(JSON.stringify(document)),
  );
  assert.equal(restored.ok, true);
  assert.equal(getStudioDefaultFontFamily(restored.document), "Brand Serif");
  assert.equal(restored.document.styles.fontTestStyle.fontFamily, undefined);
  if (document.metadata.kind === "timetable") {
    const markup = renderToStaticMarkup(
      <StudioTimetablePreview
        document={document}
        runtimeValues={createStudioInitialRuntimeValues(document)}
      />,
    );
    assert.ok(
      markup.includes("font-family:Brand Serif"),
      "Timetable domain and card text inherit the same default",
    );
  }

  const settings = renderToStaticMarkup(
    <StudioWebFontSettings
      sources={[source]}
      defaultFontFamily="Brand Serif"
      onDefaultFontFamilyChange={noop}
      onChange={noop}
    />,
  );
  assert.ok(
    settings.includes(
      '<option value="Brand Serif" selected="">Brand Serif</option>',
    ),
  );
  assert.ok(!settings.includes('value="Inter"'));

  setStudioWebFontSources(document, [{ ...source, enabled: false }]);
  assert.equal(document.resources!.defaultFontFamily, undefined);
  assert.ok(render().includes("font-family:Inter"));
  document.resources!.defaultFontFamily = "Brand Sans";
  setStudioWebFontSources(document, []);
  assert.equal(document.resources!.defaultFontFamily, undefined);
  assert.equal(resolveStudioFontFamily(document), "Inter");
  assert.equal(
    resolveStudioFontFamily(document, "Existing Family"),
    "Existing Family",
    "Existing explicit styles remain intact",
  );
}

const weekly = createStudioTimetableGraphDocument();
weekly.domains.timetable.rootNodeIds.forEach((id) => {
  weekly.graph.nodes[id].hidden = true;
});
weekly.styles.weeklyFontStyle =
  getStudioNodeDefinition("flexibleText").createDefaultStyle();
weekly.graph.nodes.weeklyFontTest = {
  id: "weeklyFontTest",
  label: "Weekly Font Test",
  type: "flexibleText",
  parentId: null,
  childIds: [],
  styleId: "weeklyFontStyle",
  binding: { kind: "staticText", value: "Font Test" },
};
weekly.graph.rootNodeIds.push("weeklyFontTest");
weekly.domains.timetable.rootNodeIds.push("weeklyFontTest");
weekly.domains.timetable.nodeExtensions.weeklyFontTest = {};
setStudioWebFontSources(weekly, [source]);
weekly.resources!.defaultFontFamily = "Brand Serif";
const weeklyMarkup = renderToStaticMarkup(
  <StudioTimetablePreview
    document={weekly}
    runtimeValues={createStudioInitialRuntimeValues(weekly)}
  />,
);
assert.ok(
  (weeklyMarkup.match(/font-family:Brand Serif/g) ?? []).length >= 2,
  "Weekly auto-fit text must receive the resolved family in both its container and typography so changing defaults retriggers measurement",
);

console.log(
  "Studio default font checks passed (both document kinds, rendering, precedence, persistence, source removal).",
);
