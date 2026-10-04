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
  if (features.dayLabelFormat && "dayLabelFormat" in patch) {
    const value = normalizeStudioDayLabelFormat(patch.dayLabelFormat);
    if (value === "default") delete binding.dayLabelFormat;
    else binding.dayLabelFormat = value;
  }
  target.binding = binding;
};
