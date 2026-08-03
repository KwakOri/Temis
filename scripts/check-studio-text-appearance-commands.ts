import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioText } from "../src/components/studio/text/studio-text";
import type {
  StudioGraphNode,
  StudioStyleRecord,
  StudioTextAppearance,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  useThumbnailNodeCommands,
  type ThumbnailNodeCommands,
} from "../src/app/(root)/admin/thumbnail-studio/_hooks/use-thumbnail-node-commands";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import {
  STUDIO_TEXT_EFFECT_PRESETS,
  type StudioTextEffectPreset,
} from "../src/utils/thumbnail-studio/text-effect-presets";
import {
  materializeStudioTextAppearance,
  validateStudioTextAppearance,
} from "../src/utils/template-studio/text-appearance-commands";
import {
  getStudioDrawableTextStrokes,
  getStudioOrderedTextStrokes,
  getStudioTextStrokeStack,
  parseLegacyStudioTextShadow,
  resolveStudioTextAppearance,
} from "../src/utils/template-studio/text-appearance";

const node = (textAppearance?: StudioTextAppearance): StudioGraphNode => ({
  id: "text",
  type: "text",
  label: "Text",
  parentId: null,
  childIds: [],
  textAppearance,
});

const scalarStyle: StudioStyleRecord = {
  color: "#ffffff",
  WebkitTextStroke: "12px #111827",
  webkitTextStroke: "12px #111827",
  textShadow: "rgba(0, 0, 0, 0.5) 2px -3px 4px",
};
const materialized = materializeStudioTextAppearance(node(), scalarStyle);
assert.equal(materialized.ok, true);
if (materialized.ok) {
  assert.equal(materialized.appearance.strokes[0]?.outset, 6);
  assert.deepEqual(materialized.appearance.shadow, {
    enabled: true,
    color: "rgba(0, 0, 0, 0.5)",
    offsetX: 2,
    offsetY: -3,
    blur: 4,
    opacity: 1,
  });
  assert.equal(materialized.style.WebkitTextStroke, undefined);
  assert.equal(materialized.style.webkitTextStroke, undefined);
  assert.equal(materialized.style.textShadow, undefined);
}
assert.equal(scalarStyle.WebkitTextStroke, "12px #111827");
assert.equal(scalarStyle.textShadow, "rgba(0, 0, 0, 0.5) 2px -3px 4px");

const colorlessLegacyStyle: StudioStyleRecord = {
  color: "#ffffff",
  WebkitTextStroke: "12px #111827",
  textShadow: "1px 2px 3px",
};
const colorlessMaterialized = materializeStudioTextAppearance(
  node(),
  colorlessLegacyStyle,
);
assert.equal(colorlessMaterialized.ok, true);
if (colorlessMaterialized.ok) {
  assert.equal(colorlessMaterialized.appearance.shadow?.color, "#ffffff");
  assert.equal(colorlessMaterialized.style.textShadow, undefined);

  const opacityAppearance = {
    ...colorlessMaterialized.appearance,
    shadow: {
      ...colorlessMaterialized.appearance.shadow!,
      opacity: 0.25,
    },
  };
  const opacityMarkup = renderToStaticMarkup(
    React.createElement(StudioText, {
      text: "Aa",
      appearance: resolveStudioTextAppearance(
        { textAppearance: opacityAppearance },
        {},
      ),
    }),
  );
  assert.ok(
    opacityMarkup.includes("rgba(255, 255, 255, 0.25)"),
    "colorless legacy shadow materializes to fill color so shadow opacity is rendered",
  );
  assert.ok(!opacityMarkup.includes("currentColor"));
}

const unresolvedColorlessStyle: StudioStyleRecord = {
  WebkitTextStroke: "12px #111827",
  textShadow: "1px 2px 3px",
};
const unresolvedColorless = materializeStudioTextAppearance(
  node(),
  unresolvedColorlessStyle,
);
assert.equal(unresolvedColorless.ok, false);
assert.equal(
  unresolvedColorlessStyle.textShadow,
  "1px 2px 3px",
  "colorless shadow without a concrete fill is kept for explicit diagnosis",
);

assert.deepEqual(
  parseLegacyStudioTextShadow({ textShadow: "2px 3px #000000" }),
  {
    enabled: true,
    color: "#000000",
    offsetX: 2,
    offsetY: 3,
    blur: 0,
    opacity: 1,
  },
);
assert.deepEqual(
  parseLegacyStudioTextShadow({ textShadow: "#000000 2px 3px" }),
  {
    enabled: true,
    color: "#000000",
    offsetX: 2,
    offsetY: 3,
    blur: 0,
    opacity: 1,
  },
  "color-first and color-last shadow syntax both materialize",
);
assert.deepEqual(
  parseLegacyStudioTextShadow({ textShadow: "1px 2px" }),
  {
    enabled: true,
    color: "currentColor",
    offsetX: 1,
    offsetY: 2,
    blur: 0,
    opacity: 1,
  },
  "two color-omitted lengths use CSS currentColor",
);
assert.deepEqual(
  parseLegacyStudioTextShadow({ textShadow: "1px 2px 3px" }),
  {
    enabled: true,
    color: "currentColor",
    offsetX: 1,
    offsetY: 2,
    blur: 3,
    opacity: 1,
  },
  "three color-omitted lengths keep blur as blur, not as color",
);
const omittedColorMaterialized = materializeStudioTextAppearance(node(), {
  color: "#ffffff",
  textShadow: "1px 2px 3px",
});
assert.equal(omittedColorMaterialized.ok, true);
if (omittedColorMaterialized.ok) {
  assert.equal(omittedColorMaterialized.appearance.shadow?.color, "#ffffff");
  assert.equal(omittedColorMaterialized.style.textShadow, undefined);
}
assert.deepEqual(parseLegacyStudioTextShadow({ textShadow: "none" }), null);

const unsupportedStyle = { textShadow: "1px 1px #000, 2px 2px #111" };
const unsupported = materializeStudioTextAppearance(node(), unsupportedStyle);
assert.equal(unsupported.ok, false);
if (!unsupported.ok) {
  assert.equal(unsupported.diagnostics[0]?.code, "legacy-shadow-unsupported");
}
assert.equal(unsupportedStyle.textShadow, "1px 1px #000, 2px 2px #111");
const unsupportedValueStyle = { textShadow: "inset 1px 2px #000" };
assert.equal(parseLegacyStudioTextShadow(unsupportedValueStyle), null);
const unsupportedValue = materializeStudioTextAppearance(
  node(),
  unsupportedValueStyle,
);
assert.equal(unsupportedValue.ok, false);
assert.equal(
  unsupportedValueStyle.textShadow,
  "inset 1px 2px #000",
  "unsupported shadow values remain available for explicit diagnosis",
);

const baseAppearance: StudioTextAppearance = {
  fill: { type: "solid", color: "#ffffff", opacity: 1 },
  strokes: [],
};
assert.equal(validateStudioTextAppearance(baseAppearance).length, 0);
assert.ok(
  validateStudioTextAppearance({
    ...baseAppearance,
    strokes: Array.from({ length: 9 }, (_, index) => ({
      id: `stroke-${index}`,
      enabled: true,
      color: "#000000",
      outset: 1,
      opacity: 1,
    })),
  }).some((item) => item.code === "strokes-count"),
);
assert.ok(
  validateStudioTextAppearance({
    ...baseAppearance,
    strokes: [
      {
        id: "stroke",
        enabled: true,
        color: "#000000",
        outset: 65,
        opacity: 1.1,
      },
    ],
  }).some((item) => item.code === "stroke-outset:0"),
);
assert.ok(
  validateStudioTextAppearance({
    ...baseAppearance,
    strokes: [
      {
        id: "a",
        enabled: true,
        color: "#000000",
        outset: 1,
        opacity: 1,
      },
      {
        id: "a",
        enabled: true,
        color: "#ffffff",
        outset: 2,
        opacity: 1,
      },
    ],
  }).some((item) => item.code.startsWith("stroke-id:")),
);
assert.ok(
  validateStudioTextAppearance({
    ...baseAppearance,
    shadow: {
      enabled: true,
      color: "#000000",
      offsetX: Number.NaN,
      offsetY: 2,
      blur: -1,
      opacity: 1,
    },
  }).some((item) => item.code === "shadow-value"),
  "commands must reject non-finite shadow offsets and negative blur",
);

assert.deepEqual(
  getStudioOrderedTextStrokes([
    { id: "thin", enabled: true, color: "#fff", outset: 1, opacity: 1 },
    { id: "thick", enabled: true, color: "#000", outset: 8, opacity: 1 },
    { id: "disabled", enabled: false, color: "#000", outset: 12, opacity: 1 },
  ]).map((stroke) => stroke.id),
  ["thin", "thick", "disabled"],
  "stored stroke order includes disabled entries for the inspector",
);
assert.deepEqual(
  getStudioDrawableTextStrokes([
    { id: "zero", enabled: true, color: "#fff", outset: 0, opacity: 1 },
    { id: "off", enabled: false, color: "#000", outset: 8, opacity: 1 },
    { id: "hidden", enabled: true, color: "#000", outset: 8, opacity: 0 },
    { id: "real", enabled: true, color: "#000", outset: 8, opacity: 1 },
  ]).map((stroke) => stroke.id),
  ["real"],
  "renderer drawable strokes exclude disabled, transparent and zero-outset entries",
);
assert.equal(
  getStudioDrawableTextStrokes(
    Array.from({ length: 10 }, (_, index) => ({
      id: `stroke-${index}`,
      enabled: true,
      color: "#000",
      outset: index + 1,
      opacity: 1,
    })),
  ).length,
  8,
  "renderer never creates more than eight stroke layers",
);

// --- 실제 document command mutation과 lock 계약 ---

const commandDocument = createThumbnailStudioDocument();
commandDocument.graph.rootNodeIds = ["text"];
commandDocument.graph.nodes.text = node();
commandDocument.graph.nodes.text.styleId = "text-style";
commandDocument.graph.nodes.image = {
  id: "image",
  type: "image",
  label: "Image",
  parentId: null,
  childIds: [],
  styleId: "image-style",
  fit: "cover",
  locked: true,
};
commandDocument.styles["text-style"] = {
  color: "#ffffff",
  fontSize: 42,
  backgroundColor: "#123456",
  WebkitTextStroke: "12px #111827",
  webkitTextStroke: "12px #111827",
  textShadow: "2px 3px 4px",
};
commandDocument.styles["image-style"] = {
  objectPosition: "50% 50%",
  opacity: 1,
};
let currentDocument = commandDocument;
let historyCaptures = 0;
const statusMessages: string[] = [];
let customPresets: StudioTextEffectPreset[] = [];
let commands!: ThumbnailNodeCommands;
const setCustomPresets = (
  value:
    | StudioTextEffectPreset[]
    | ((current: StudioTextEffectPreset[]) => StudioTextEffectPreset[]),
) => {
  customPresets = typeof value === "function" ? value(customPresets) : value;
};
const Harness = () => {
  commands = useThumbnailNodeCommands({
    getDocument: () => currentDocument,
    getSelectedNodeIds: () => ["text"],
    getSelectedNodeId: () => "text",
    getViewportCenter: () => null,
    updateDocument: (mutate, options = {}) => {
      if (options.history !== false) historyCaptures += 1;
      const draft = JSON.parse(
        JSON.stringify(currentDocument),
      ) as StudioTemplateDocument;
      mutate(draft);
      currentDocument = draft;
    },
    captureHistory: () => {
      historyCaptures += 1;
    },
    applySelection: () => undefined,
    selectSingleNode: () => undefined,
    onStatusMessage: (message) => statusMessages.push(message),
    getCustomTextPresets: () => customPresets,
    setCustomTextPresets: setCustomPresets,
  });
  return React.createElement("span");
};
renderToStaticMarkup(React.createElement(Harness));
const lockedImageSnapshot = JSON.stringify(currentDocument);
const lockedImageHistory = historyCaptures;
commands.setStyleValue("image", "opacity", 0.2);
assert.equal(
  JSON.stringify(currentDocument),
  lockedImageSnapshot,
  "locked image style commands must not mutate the document",
);
assert.equal(
  historyCaptures,
  lockedImageHistory,
  "locked image style commands must not create history",
);
currentDocument.graph.nodes.image!.locked = false;
commands.setStyleValue("image", "objectPosition", "120% -10%");
assert.equal(
  currentDocument.styles["image-style"].objectPosition,
  "100% 0%",
  "image object-position command must clamp focus values",
);
const unlockedImageHistory = historyCaptures;
commands.setTextFill("text", { color: "#ef4444" });
assert.equal(currentDocument.styles["text-style"].fontSize, 42);
assert.equal(currentDocument.styles["text-style"].WebkitTextStroke, undefined);
assert.equal(currentDocument.styles["text-style"].webkitTextStroke, undefined);
assert.equal(currentDocument.styles["text-style"].textShadow, undefined);
assert.equal(historyCaptures, unlockedImageHistory + 1);

currentDocument.styles["text-style"].textShadow = "1px 1px #000, 2px 2px #111";
const unsupportedCommandSnapshot = JSON.stringify(currentDocument);
const unsupportedCommandHistory = historyCaptures;
commands.setTextFill("text", { color: "#22c55e" });
assert.equal(JSON.stringify(currentDocument), unsupportedCommandSnapshot);
assert.equal(historyCaptures, unsupportedCommandHistory);
delete currentDocument.styles["text-style"].textShadow;

currentDocument.styles["text-style"].WebkitTextStroke = "8px #000";
currentDocument.styles["text-style"].webkitTextStroke = "8px #000";
currentDocument.styles["text-style"].textShadow = "1px 2px";
commands.applyTextPreset("text", STUDIO_TEXT_EFFECT_PRESETS[0]);
assert.equal(currentDocument.styles["text-style"].WebkitTextStroke, undefined);
assert.equal(currentDocument.styles["text-style"].webkitTextStroke, undefined);
assert.equal(currentDocument.styles["text-style"].textShadow, undefined);
assert.equal(currentDocument.styles["text-style"].backgroundColor, "#123456");

currentDocument.graph.nodes.text.textAppearance = {
  fill: { type: "solid", color: "#fff", opacity: 1 },
  strokes: [
    { id: "disabled", enabled: false, color: "#000", outset: 4, opacity: 1 },
  ],
};
commands.updateTextStroke("text", "disabled", { enabled: true });
assert.equal(
  currentDocument.graph.nodes.text.textAppearance?.strokes[0]?.enabled,
  true,
);
commands.updateTextStroke("text", "disabled", { enabled: false });
currentDocument.graph.nodes.text.textAppearance!.strokes = [
  { id: "back", enabled: true, color: "#000", outset: 6, opacity: 1 },
  { id: "disabled", enabled: false, color: "#111", outset: 4, opacity: 1 },
  { id: "front", enabled: true, color: "#222", outset: 2, opacity: 1 },
];
const historyBeforeStrokeDrag = historyCaptures;
commands.moveTextStroke("text", "disabled", 0);
assert.equal(historyCaptures, historyBeforeStrokeDrag + 1);
assert.deepEqual(
  currentDocument.graph.nodes.text.textAppearance?.strokes.map(
    (stroke) => stroke.id,
  ),
  ["back", "front", "disabled"],
  "panel reorder persists the reversed saved array order, including disabled strokes",
);
commands.updateTextStroke("text", "disabled", { enabled: true });
assert.deepEqual(
  getStudioDrawableTextStrokes(
    currentDocument.graph.nodes.text.textAppearance?.strokes ?? [],
  ).map((stroke) => stroke.id),
  ["back", "front", "disabled"],
  "renderer drawable order follows the saved stroke order after panel drag",
);

// --- 누적 thickness command mutations ---

currentDocument.graph.nodes.text.textAppearance!.strokes = [];
commands.addTextStroke("text");
commands.addTextStroke("text");
commands.addTextStroke("text");
const addedStack = getStudioTextStrokeStack(
  currentDocument.graph.nodes.text.textAppearance!.strokes,
);
assert.deepEqual(
  addedStack.map(({ thickness, effectiveOutset }) => ({
    thickness,
    effectiveOutset,
  })),
  [
    { thickness: 4, effectiveOutset: 4 },
    { thickness: 4, effectiveOutset: 8 },
    { thickness: 4, effectiveOutset: 12 },
  ],
  "each Add creates a visible default 4px band and stores cumulative outsets",
);
assert.deepEqual(
  currentDocument.graph.nodes.text.textAppearance!.strokes.map(
    ({ outset }) => outset,
  ),
  [12, 8, 4],
);

const [innerStroke, middleStroke, outerStroke] = addedStack.map(
  ({ stroke }) => stroke.id,
);
commands.setTextStrokeThickness("text", outerStroke, 24);
assert.deepEqual(
  getStudioTextStrokeStack(
    currentDocument.graph.nodes.text.textAppearance!.strokes,
  ).map(({ thickness, effectiveOutset }) => ({
    thickness,
    effectiveOutset,
  })),
  [
    { thickness: 4, effectiveOutset: 4 },
    { thickness: 4, effectiveOutset: 8 },
    { thickness: 24, effectiveOutset: 32 },
  ],
  "changing an outer thickness updates only its cumulative outset",
);
commands.setTextStrokeThickness("text", innerStroke, 6);
assert.deepEqual(
  getStudioTextStrokeStack(
    currentDocument.graph.nodes.text.textAppearance!.strokes,
  ).map(({ thickness, effectiveOutset }) => ({
    thickness,
    effectiveOutset,
  })),
  [
    { thickness: 6, effectiveOutset: 6 },
    { thickness: 4, effectiveOutset: 10 },
    { thickness: 24, effectiveOutset: 34 },
  ],
  "changing an inner thickness propagates through outer effective outsets",
);
commands.deleteTextStroke("text", middleStroke);
assert.deepEqual(
  getStudioTextStrokeStack(
    currentDocument.graph.nodes.text.textAppearance!.strokes,
  ).map(({ stroke, thickness, effectiveOutset }) => ({
    id: stroke.id,
    thickness,
    effectiveOutset,
  })),
  [
    { id: innerStroke, thickness: 6, effectiveOutset: 6 },
    { id: outerStroke, thickness: 24, effectiveOutset: 30 },
  ],
  "deleting a middle stroke preserves the remaining individual thicknesses",
);

currentDocument.graph.nodes.text.textAppearance!.strokes = [
  { id: "black", enabled: true, color: "#000", outset: 32, opacity: 1 },
  { id: "orange", enabled: true, color: "#f80", outset: 8, opacity: 1 },
  { id: "blue", enabled: true, color: "#00f", outset: 4, opacity: 1 },
];
commands.moveTextStroke("text", "black", 0);
assert.deepEqual(
  getStudioTextStrokeStack(
    currentDocument.graph.nodes.text.textAppearance!.strokes,
  ).map(({ stroke, thickness, effectiveOutset }) => ({
    id: stroke.id,
    thickness,
    effectiveOutset,
  })),
  [
    { id: "black", thickness: 24, effectiveOutset: 24 },
    { id: "blue", thickness: 4, effectiveOutset: 28 },
    { id: "orange", thickness: 4, effectiveOutset: 32 },
  ],
  "reorder moves color and thickness together, then recalculates effective outsets",
);

currentDocument.graph.nodes.text.textAppearance!.strokes = [
  { id: "outer", enabled: true, color: "#000", outset: 28, opacity: 1 },
  { id: "inner", enabled: true, color: "#fff", outset: 4, opacity: 1 },
];
commands.duplicateTextStroke("text", "outer");
const duplicatedStack = getStudioTextStrokeStack(
  currentDocument.graph.nodes.text.textAppearance!.strokes,
);
assert.deepEqual(
  duplicatedStack.map(({ thickness, effectiveOutset }) => ({
    thickness,
    effectiveOutset,
  })),
  [
    { thickness: 4, effectiveOutset: 4 },
    { thickness: 24, effectiveOutset: 28 },
    { thickness: 24, effectiveOutset: 52 },
  ],
  "duplicate copies the individual thickness and places the copy adjacent in the panel",
);
const duplicateOverflowSnapshot = JSON.stringify(currentDocument);
commands.duplicateTextStroke("text", duplicatedStack[2].stroke.id);
assert.equal(
  JSON.stringify(currentDocument),
  duplicateOverflowSnapshot,
  "duplicate is rejected when cumulative outset would exceed 64px",
);
assert.equal(statusMessages.at(-1), "Total stroke outset cannot exceed 64px.");

currentDocument.graph.nodes.text.textAppearance!.strokes = [
  { id: "nearly-full", enabled: true, color: "#000", outset: 62, opacity: 1 },
];
commands.addTextStroke("text");
assert.deepEqual(
  getStudioTextStrokeStack(
    currentDocument.graph.nodes.text.textAppearance!.strokes,
  ).map(({ thickness, effectiveOutset }) => ({ thickness, effectiveOutset })),
  [
    { thickness: 62, effectiveOutset: 62 },
    { thickness: 2, effectiveOutset: 64 },
  ],
  "Add uses the remaining 1–3px instead of exceeding the 64px limit",
);

const lockedHistory = historyCaptures;
currentDocument.graph.nodes.text.locked = true;
const lockedSnapshot = JSON.stringify(currentDocument);
commands.setTextFill("text", { color: "#000000" });
commands.addTextStroke("text");
commands.updateTextStroke("text", "disabled", { enabled: true });
commands.duplicateTextStroke("text", "disabled");
commands.deleteTextStroke("text", "disabled");
commands.moveTextStroke("text", "disabled", 1);
commands.setTextShadow("text", {});
commands.removeTextShadow("text");
commands.applyTextPreset("text", STUDIO_TEXT_EFFECT_PRESETS[0]);
commands.createTextPreset("text");
assert.equal(JSON.stringify(currentDocument), lockedSnapshot);
assert.equal(historyCaptures, lockedHistory);
assert.equal(customPresets.length, 0);

console.log("Studio text appearance command checks passed.");
