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
type KnownRole = "main_title" | "sub_title" | "offline_memo" | "time" | "day_label" | "date" | "status_label";

const classifyRole = (name: string, characters: string): Classification["role"] => {
  const normalized = normalizeFigmaLayerName(name);
  const content = characters.trim();
  if (/^(?:(am|pm)\s*)?\d{1,2}:\d{2}$/i.test(content)) return "time";
  if (/^(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(content)) return "day_label";
  if (/^\d{1,2}$/.test(content)) return "date";
  if (/^(online|offline)$/i.test(content)) return "status_label";
  if (["main", "maintitle", "title", "heading"].includes(normalized)) return "main_title";
  if (["sub", "subtitle", "subheading"].includes(normalized)) return "sub_title";
  if (["offlinememo", "오프라인메모"].includes(normalized)) return "offline_memo";
  if (["time", "entrytime", "streamingtime", "clock"].includes(normalized)) return "time";
  if (["mon", "day", "daylabel", "shortday", "streamingday", "weekday"].includes(normalized)) return "day_label";
  if (["date", "daydate", "streamingdate"].includes(normalized)) return "date";
  if (["online", "offline", "status", "state", "statuslabel"].includes(normalized)) return "status_label";
  return "unknown";
};

export const bindingForFigmaRole = (
  role: StudioFigmaNodeReview["suggestedRole"],
  characters: string,
): StudioBinding => {
  const bindings: Record<KnownRole, StudioBinding> = {
    main_title: { kind: "builtinField", fieldId: "entry.main_title" },
    sub_title: { kind: "builtinField", fieldId: "entry.sub_title" },
    offline_memo: { kind: "builtinField", fieldId: "day.offline_memo" },
    time: { kind: "builtinField", fieldId: "entry.time" },
    day_label: { kind: "builtinField", fieldId: "day.short_label", dayLabelFormat: "shortUpper" },
    date: { kind: "builtinField", fieldId: "day.date", dateRangeFormat: "day" },
    status_label: { kind: "builtinField", fieldId: "entry.status_label" },
  };
  return role === "unknown" || role === "decoration"
    ? { kind: "staticText", value: characters }
    : bindings[role];
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

  const isDynamicText = role === "main_title" || role === "sub_title" || role === "offline_memo";
  return {
    role,
    studioType: isDynamicText ? "flexibleText" : "text",
    binding: bindingForFigmaRole(role, input.characters),
    confidence: input.textAutoResize || input.layoutSizingHorizontal ? 0.95 : 0.9,
    reason: isDynamicText
      ? "Semantic dynamic text role matched; this GRID field defaults to Auto Text."
      : "Semantic role matched from the layer name or text content.",
  };
};
