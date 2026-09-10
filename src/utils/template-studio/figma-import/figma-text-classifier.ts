import type { StudioBinding } from "@/types/template-studio";
import type { StudioFigmaNodeReview } from "@/types/template-studio-figma";

export const normalizeFigmaLayerName = (value: string): string =>
  value.trim().replace(/[\s_-]+/g, "").toLowerCase();

type Classification = {
  role: StudioFigmaNodeReview["suggestedRole"];
  studioType: "text" | "flexibleText";
  binding: StudioBinding;
  confidence: number;
  reason: string;
};
type KnownRole = "main_title" | "sub_title" | "time" | "day_label" | "date" | "status_label";

const classifyRole = (name: string, characters: string): Classification["role"] => {
  const normalized = normalizeFigmaLayerName(name);
  if (["maintitle", "title", "heading"].includes(normalized)) return "main_title";
  if (["subtitle", "subheading"].includes(normalized)) return "sub_title";
  if (["time", "entrytime"].includes(normalized) || /^(am|pm)\s*\d{1,2}:\d{2}$/i.test(characters)) return "time";
  if (["mon", "day", "daylabel", "shortday"].includes(normalized) || /^(mon|tue|wed|thu|fri|sat|sun)$/i.test(characters)) return "day_label";
  if (["date", "daydate"].includes(normalized) || /^\d{1,2}$/.test(characters.trim())) return "date";
  if (["online", "offline", "status", "statuslabel"].includes(normalized) || /^(online|offline)$/i.test(characters.trim())) return "status_label";
  return "unknown";
};

export const classifyFigmaTextNode = (input: {
  name: string;
  characters: string;
  textAutoResize?: string;
  layoutSizingHorizontal?: string;
  width?: number;
  height?: number;
}): Classification => {
  const role = classifyRole(input.name, input.characters);
  if (role === "unknown") {
    return {
      role,
      studioType: "text",
      binding: { kind: "staticText", value: input.characters },
      confidence: 0.2,
      reason: "No semantic alias matched; review this text node before importing it.",
    };
  }

  const bindings: Record<KnownRole, StudioBinding> = {
    main_title: { kind: "builtinField", fieldId: "entry.main_title" },
    sub_title: { kind: "builtinField", fieldId: "entry.sub_title" },
    time: { kind: "builtinField", fieldId: "entry.time" },
    day_label: { kind: "builtinField", fieldId: "day.short_label" },
    date: { kind: "builtinField", fieldId: "day.date", dateRangeFormat: "day" },
    status_label: { kind: "builtinField", fieldId: "entry.status_label" },
  };
  const isDynamicTitle = role === "main_title" &&
    (input.textAutoResize === "HEIGHT" || input.layoutSizingHorizontal === "FILL" || input.characters.length > 32);
  return {
    role,
    studioType: isDynamicTitle ? "flexibleText" : "text",
    binding: bindings[role as KnownRole],
    confidence: input.textAutoResize || input.layoutSizingHorizontal ? 0.95 : 0.9,
    reason: isDynamicTitle
      ? "Semantic title role matched; flexible sizing metadata supports Auto Text."
      : "Semantic role matched from the layer name or text content.",
  };
};
