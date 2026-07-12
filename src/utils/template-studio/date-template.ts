import { StudioTemplateDocument } from "@/types/template-studio";

export type StudioDateParts = {
  year: string;
  month: string;
  day: string;
};

export const STUDIO_WEEK_DATE_LONG_TEMPLATE =
  "${start.YYYY}.${start.MM}.${start.DD} - ${end.MM}.${end.DD}";

export const STUDIO_WEEK_DATE_FORMAT_PRESETS = [
  {
    id: "long",
    label: "2026.07.01 - 07.07",
    template: STUDIO_WEEK_DATE_LONG_TEMPLATE,
  },
  {
    id: "short",
    label: "07.01 - 07.07",
    template: "${start.MM}.${start.DD} - ${end.MM}.${end.DD}",
  },
  {
    id: "localized",
    label: "Localized",
    template: "${start.localized} - ${end.localizedWithYear}",
  },
  {
    id: "split",
    label: "Split lines",
    template: "${start.YYYY}.${start.MM}.${start.DD}\n${end.MM}.${end.DD}",
  },
] as const;

export const STUDIO_WEEK_DATE_TEMPLATE_TOKENS = [
  "${start.YYYY}",
  "${start.YY}",
  "${start.MM}",
  "${start.M}",
  "${start.DD}",
  "${start.D}",
  "${start.weekdayShort}",
  "${end.YYYY}",
  "${end.YY}",
  "${end.MM}",
  "${end.M}",
  "${end.DD}",
  "${end.D}",
  "${end.weekdayShort}",
] as const;

type StudioWeekDateFormatPresetId =
  (typeof STUDIO_WEEK_DATE_FORMAT_PRESETS)[number]["id"];

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_SHORT_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const parseStudioIsoDateParts = (value: string | undefined) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
};

export const getStudioDatePartsWithDayOffset = (
  value: string | undefined,
  offset: number,
) => {
  const parts = parseStudioIsoDateParts(value);
  if (!parts) return null;

  const date = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day) + offset,
    ),
  );

  return {
    year: String(date.getUTCFullYear()).padStart(4, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
};

export const formatStudioDateParts = (
  parts: StudioDateParts | null,
  options: { includeYear: boolean },
) => {
  if (!parts) return "";
  return options.includeYear
    ? `${parts.year}.${parts.month}.${parts.day}`
    : `${parts.month}.${parts.day}`;
};

export const getStudioWeekStartParts = (
  document: StudioTemplateDocument,
  startDateOverride?: string,
) =>
  parseStudioIsoDateParts(
    startDateOverride ?? document.domains?.timetable?.week?.startDate,
  );

export const getStudioWeekEndParts = (
  document: StudioTemplateDocument,
  startDateOverride?: string,
) => {
  const timetable = document.domains?.timetable;
  if (parseStudioIsoDateParts(startDateOverride)) {
    return getStudioDatePartsWithDayOffset(
      startDateOverride,
      Math.max(0, (timetable?.dayIds.length ?? 0) - 1),
    );
  }

  const explicitEndParts = parseStudioIsoDateParts(timetable?.week?.endDate);
  if (explicitEndParts) return explicitEndParts;

  if (!timetable?.week?.startDate) return null;
  return getStudioDatePartsWithDayOffset(
    timetable.week.startDate,
    Math.max(0, timetable.dayIds.length - 1),
  );
};

const getUtcDate = (parts: StudioDateParts | null): Date | null => {
  if (!parts) return null;
  return new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
};

const getLocalizedDate = (
  parts: StudioDateParts | null,
  options: { includeYear: boolean },
) => {
  const date = getUtcDate(parts);
  if (!date) return "";

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: options.includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  });

  return formatter.format(date);
};

const formatStudioDateToken = (
  parts: StudioDateParts | null,
  token: string,
) => {
  if (!parts) return "";

  const date = getUtcDate(parts);
  const weekdayIndex = date?.getUTCDay() ?? 0;

  if (token === "YYYY") return parts.year;
  if (token === "YY") return parts.year.slice(-2);
  if (token === "M") return String(Number(parts.month));
  if (token === "MM") return parts.month;
  if (token === "D") return String(Number(parts.day));
  if (token === "DD") return parts.day;
  if (token === "weekday") return WEEKDAY_LABELS[weekdayIndex];
  if (token === "weekdayShort") return WEEKDAY_SHORT_LABELS[weekdayIndex];
  if (token === "localized") {
    return getLocalizedDate(parts, { includeYear: false });
  }
  if (token === "localizedWithYear") {
    return getLocalizedDate(parts, { includeYear: true });
  }

  return null;
};

export const resolveStudioDateTemplate = ({
  template,
  start,
  end,
  primary = start ?? end,
}: {
  template: string;
  start?: StudioDateParts | null;
  end?: StudioDateParts | null;
  primary?: StudioDateParts | null;
}) =>
  template.replace(/\$\{\s*([A-Za-z.]+)\s*\}/g, (match, rawToken) => {
    const token = String(rawToken);
    const [namespace, ...tokenParts] = token.split(".");

    if ((namespace === "start" || namespace === "end") && tokenParts.length) {
      const value = formatStudioDateToken(
        namespace === "start" ? (start ?? null) : (end ?? null),
        tokenParts.join("."),
      );
      return value ?? match;
    }

    const value = formatStudioDateToken(primary ?? null, token);
    return value ?? match;
  });

const getWeekDatePresetTemplate = (
  format: string | undefined,
): string | null => {
  const preset = STUDIO_WEEK_DATE_FORMAT_PRESETS.find(
    (candidate) => candidate.id === format,
  );
  return preset?.template ?? null;
};

export const resolveStudioWeekDateText = (
  document: StudioTemplateDocument,
  options: {
    format?: string;
    template?: string;
    startDate?: string;
  } = {},
) => {
  const start = getStudioWeekStartParts(document, options.startDate);
  const end = getStudioWeekEndParts(document, options.startDate);
  if (!start && !end) return "";

  const template =
    options.template?.trimEnd() ||
    getWeekDatePresetTemplate(options.format) ||
    STUDIO_WEEK_DATE_LONG_TEMPLATE;

  return resolveStudioDateTemplate({
    template,
    start,
    end,
    primary: start ?? end,
  });
};

export const isStudioWeekDateFormatPresetId = (
  value: string,
): value is StudioWeekDateFormatPresetId =>
  STUDIO_WEEK_DATE_FORMAT_PRESETS.some((preset) => preset.id === value);
