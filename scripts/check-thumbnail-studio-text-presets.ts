import assert from "node:assert/strict";

import type { StudioTextAppearance } from "../src/types/template-studio";
import { getStudioTextFillPrimaryColor } from "../src/utils/template-studio/text-appearance";
import {
  STUDIO_TEXT_EFFECT_PRESETS,
  STUDIO_TEXT_PRESET_TYPOGRAPHY_KEYS,
  cloneStudioTextEffectPreset,
  isStudioBuiltinTextEffectPresetVersionValid,
  pickStudioTextPresetTypography,
} from "../src/utils/thumbnail-studio/text-effect-presets";
import {
  createStudioCustomTextPreset,
  deleteStudioCustomTextPreset,
  duplicateStudioCustomTextPreset,
  renameStudioCustomTextPreset,
} from "../src/utils/thumbnail-studio/text-preset-session";

const ids = STUDIO_TEXT_EFFECT_PRESETS.map((preset) => preset.id);
assert.equal(
  new Set(ids).size,
  ids.length,
  "builtin preset IDs must be unique",
);
STUDIO_TEXT_EFFECT_PRESETS.forEach((preset) => {
  assert.equal(preset.source, "builtin");
  assert.ok(isStudioBuiltinTextEffectPresetVersionValid(preset));
  assert.ok(preset.label);
  assert.ok(preset.previewText);
  assert.deepEqual(
    Object.keys(preset.typography).filter(
      (key) =>
        !STUDIO_TEXT_PRESET_TYPOGRAPHY_KEYS.includes(
          key as (typeof STUDIO_TEXT_PRESET_TYPOGRAPHY_KEYS)[number],
        ),
    ),
    [],
  );
  assert.ok(preset.appearance.fill);
});
assert.equal(
  isStudioBuiltinTextEffectPresetVersionValid({
    source: "builtin",
    version: 0,
  }),
  false,
  "builtin versions start at one",
);
assert.equal(
  isStudioBuiltinTextEffectPresetVersionValid({
    source: "builtin",
    version: 1.5,
  }),
  false,
  "builtin versions are integers",
);

const copied = cloneStudioTextEffectPreset(STUDIO_TEXT_EFFECT_PRESETS[0]);
assert.equal(copied.appearance.fill.type, "solid");
if (copied.appearance.fill.type === "solid") {
  copied.appearance.fill.color = "#000000";
}
assert.notEqual(
  getStudioTextFillPrimaryColor(copied.appearance.fill),
  getStudioTextFillPrimaryColor(STUDIO_TEXT_EFFECT_PRESETS[0].appearance.fill),
  "preset consumers receive a deep copy",
);
const typography = pickStudioTextPresetTypography({
  fontSize: 40,
  left: 10,
  top: 20,
  width: 100,
  height: 30,
});
assert.deepEqual(typography, { fontSize: 40 });

const appearance: StudioTextAppearance = {
  fill: { type: "solid", color: "#ffffff", opacity: 1 },
  strokes: [],
  presetRef: { source: "builtin", presetId: "clean-white", presetVersion: 1 },
};
const custom = createStudioCustomTextPreset({
  id: "custom-a",
  label: "My Text",
  previewText: "Preview",
  typography: { fontSize: 48, left: 2 },
  appearance,
});
assert.equal(custom.source, "custom");
assert.equal(custom.version, 1);
assert.equal(custom.appearance.presetRef, undefined);
assert.deepEqual(custom.typography, { fontSize: 48 });

const duplicate = duplicateStudioCustomTextPreset(custom, "custom-b");
assert.equal(duplicate.id, "custom-b");
assert.equal(duplicate.version, 1);
assert.equal(duplicate.label, "My Text Copy");
const renamed = renameStudioCustomTextPreset(duplicate, "Renamed");
assert.equal(renamed.version, 1, "renaming does not bump version");
assert.equal(renamed.label, "Renamed");
assert.deepEqual(deleteStudioCustomTextPreset([custom, renamed], custom.id), [
  renamed,
]);

const gradientAppearance: StudioTextAppearance = {
  fill: {
    type: "linearGradient",
    startColor: "#ef4444",
    endColor: "#3b82f6",
    angleDeg: 180,
    opacity: 0.6,
  },
  strokes: [],
};
const gradientPreset = createStudioCustomTextPreset({
  id: "custom-gradient",
  label: "Gradient Text",
  previewText: "Gradient",
  typography: { fontSize: 48 },
  appearance: gradientAppearance,
});
assert.deepEqual(gradientPreset.appearance.fill, gradientAppearance.fill);
const gradientCopy = duplicateStudioCustomTextPreset(
  gradientPreset,
  "custom-gradient-copy",
);
if (gradientCopy.appearance.fill.type === "linearGradient") {
  gradientCopy.appearance.fill.startColor = "#000000";
}
assert.equal(
  gradientPreset.appearance.fill.type === "linearGradient"
    ? gradientPreset.appearance.fill.startColor
    : "",
  "#ef4444",
  "gradient preset copies keep nested fill values independent",
);

assert.equal(renamed.appearance.fill.type, "solid");
if (renamed.appearance.fill.type === "solid") {
  renamed.appearance.fill.color = "#ef4444";
}
assert.equal(getStudioTextFillPrimaryColor(custom.appearance.fill), "#ffffff");
assert.equal(
  getStudioTextFillPrimaryColor(duplicate.appearance.fill),
  "#ffffff",
);

console.log("Thumbnail Studio text preset checks passed.");
