import type { StudioBinding } from "@/types/template-studio";
import { getStudioDateFormatMode } from "./date-template";
import {
  isStudioDayLabelBuiltinField,
  isStudioTimeBuiltinField,
  normalizeStudioDayLabelFormat,
} from "./builtin-fields";

export const getStudioBindingFormatFeatures = (binding?: StudioBinding) => ({
  dateFormatMode:
    binding?.kind === "builtinField"
      ? getStudioDateFormatMode(binding.fieldId)
      : null,
  dayLabelFormat:
    binding?.kind === "builtinField" &&
    isStudioDayLabelBuiltinField(binding.fieldId),
  timeFormat:
    binding?.kind === "builtinField" &&
    isStudioTimeBuiltinField(binding.fieldId),
});

export type StudioBindingFormatPatch = Partial<
  Pick<
    Extract<StudioBinding, { kind: "builtinField" }>,
    | "dateRangeFormat"
    | "dateRangeTemplate"
    | "timeFormat"
    | "timeAmText"
    | "timePmText"
    | "dayLabelFormat"
    | "dayLabelTemplate"
  >
>;

/** Keep other binding properties when changing or resetting a single format. */
export const applyStudioBindingFormatPatch = (
  target: { binding?: StudioBinding },
  patch: StudioBindingFormatPatch,
) => {
  if (target.binding?.kind !== "builtinField") return;
  const features = getStudioBindingFormatFeatures(target.binding);
  const binding = { ...target.binding };
  if (features.dateFormatMode) {
    if ("dateRangeFormat" in patch)
      binding.dateRangeFormat = patch.dateRangeFormat;
    if ("dateRangeTemplate" in patch)
      binding.dateRangeTemplate = patch.dateRangeTemplate;
  }
  if (features.timeFormat) {
    if ("timeFormat" in patch) binding.timeFormat = patch.timeFormat;
    if ("timeAmText" in patch) binding.timeAmText = patch.timeAmText;
    if ("timePmText" in patch) binding.timePmText = patch.timePmText;
  }
  if (
    features.dayLabelFormat &&
    ("dayLabelFormat" in patch || "dayLabelTemplate" in patch)
  ) {
    if (binding.fieldId === "day.short_label") {
      binding.fieldId = "day.label";
      if (normalizeStudioDayLabelFormat(binding.dayLabelFormat) === "default")
        binding.dayLabelFormat = "documentShort";
    }
    if ("dayLabelFormat" in patch) {
      const value = normalizeStudioDayLabelFormat(patch.dayLabelFormat);
      if (value === "default") delete binding.dayLabelFormat;
      else binding.dayLabelFormat = value;
      // A preset reset must clear the previous custom template as well.
      if (!("dayLabelTemplate" in patch)) delete binding.dayLabelTemplate;
    }
    if ("dayLabelTemplate" in patch)
      binding.dayLabelTemplate = patch.dayLabelTemplate;
  }
  target.binding = binding;
};
