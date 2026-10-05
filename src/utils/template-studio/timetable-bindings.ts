import type {
  StudioBinding,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";

/** A read-only adapter for Week Dates documents that stored format in style. */
export const getStudioTimetableTextBinding = (
  object: StudioTimetableCompositionObject,
): StudioBinding | undefined => {
  const isWeekDates =
    object.presetId === "weekDates" ||
    object.meta?.exception?.semanticKey === "weekDates";
  if (
    !isWeekDates ||
    (object.kind !== "text" && object.kind !== "flexibleText")
  )
    return object.binding;
  if (
    object.binding?.kind === "builtinField" &&
    object.binding.fieldId !== "week.date_range"
  )
    return object.binding;
  const binding =
    object.binding?.kind === "builtinField"
      ? object.binding
      : { kind: "builtinField" as const, fieldId: "week.date_range" as const };
  const hasLegacyFormat =
    object.style.dateRangeFormat !== undefined ||
    object.style.dateRangeTemplate !== undefined;
  if (!hasLegacyFormat) return binding;
  // The old renderer used the style pair as a whole. Preserve its precedence/defaults.
  return {
    ...binding,
    dateRangeFormat:
      typeof object.style.dateRangeFormat === "string"
        ? object.style.dateRangeFormat
        : "long",
    dateRangeTemplate:
      typeof object.style.dateRangeTemplate === "string"
        ? object.style.dateRangeTemplate
        : "",
  };
};

export const normalizeStudioTimetableDateBinding = (
  object: StudioTimetableCompositionObject,
) => {
  const binding = getStudioTimetableTextBinding(object);
  if (binding === object.binding) return;
  object.binding = binding;
  object.style = { ...object.style };
  delete object.style.dateRangeFormat;
  delete object.style.dateRangeTemplate;
};
