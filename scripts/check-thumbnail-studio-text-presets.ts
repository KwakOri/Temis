import assert from "node:assert/strict";

import type { StudioTextAppearance } from "../src/types/template-studio";
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
copied.appearance.fill.color = "#000000";
assert.notEqual(
  copied.appearance.fill.color,
  STUDIO_TEXT_EFFECT_PRESETS[0].appearance.fill.color,
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

renamed.appearance.fill.color = "#ef4444";
assert.equal(custom.appearance.fill.color, "#ffffff");
assert.equal(duplicate.appearance.fill.color, "#ffffff");

console.log("Thumbnail Studio text preset checks passed.");
