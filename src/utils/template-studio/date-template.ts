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

/** 단일 날짜를 표시할 때 사용하는 프리셋. 시간표 기간 프리셋과 분리하되
 * binding 필드명(dateRangeFormat/dateRangeTemplate)은 호환성을 위해 유지한다. */
export const STUDIO_SINGLE_DATE_FORMAT_PRESETS = [
  {
    id: "long",
    label: "2026.07.01",
    template: "${YYYY}.${MM}.${DD}",
  },
  {
    id: "short",
    label: "07.01",
    template: "${MM}.${DD}",
  },
  {
    id: "localized",
    label: "Jul 01, 2026",
    template: "${localizedWithYear}",
  },
  {
    id: "weekday",
    label: "2026.07.01 (Wed)",
    template: "${YYYY}.${MM}.${DD} (${weekdayShort})",
  },
] as const;

export type StudioDateFormatMode = "range" | "single";

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

export const STUDIO_SINGLE_DATE_TEMPLATE_TOKENS = [
  "${YYYY}",
  "${YY}",
  "${MM}",
  "${M}",
  "${DD}",
  "${D}",
  "${weekday}",
  "${weekdayShort}",
  "${localized}",
  "${localizedWithYear}",
] as const;

type StudioWeekDateFormatPresetId =
  (typeof STUDIO_WEEK_DATE_FORMAT_PRESETS)[number]["id"];
type StudioSingleDateFormatPresetId =
  (typeof STUDIO_SINGLE_DATE_FORMAT_PRESETS)[number]["id"];

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
  const parts = {
    year: match[1],
    month: match[2],
    day: match[3],
  };

  const date = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
  if (
    date.getUTCFullYear() !== Number(parts.year) ||
    date.getUTCMonth() !== Number(parts.month) - 1 ||
    date.getUTCDate() !== Number(parts.day)
  ) {
    return null;
  }

  return parts;
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

export interface StudioDateRangeResolverOptions {
  startDate?: string;
  endDate?: string;
  dayCount?: number;
  format?: string;
  template?: string;
  locale?: string;
}

/**
 * 날짜 공급원과 기간만 받아 날짜 범위를 계산한다.
 *
 * timetable 문서를 직접 읽지 않으므로 Thumbnail과 Timetable이 같은 계산기를
 * 사용하면서도 각자 자신의 입력 어댑터를 둘 수 있다.
 */
export const getStudioDateRangeParts = ({
  startDate,
  endDate,
  dayCount = 7,
}: Pick<
  StudioDateRangeResolverOptions,
  "startDate" | "endDate" | "dayCount"
>) => {
  const start = parseStudioIsoDateParts(startDate);
  if (!start) return { start: null, end: parseStudioIsoDateParts(endDate) };

  const explicitEnd = parseStudioIsoDateParts(endDate);
  if (explicitEnd) return { start, end: explicitEnd };

  const normalizedDayCount = Number.isFinite(dayCount)
    ? Math.max(1, Math.floor(dayCount))
    : 7;
  return {
    start,
    end: getStudioDatePartsWithDayOffset(startDate, normalizedDayCount - 1),
  };
};

const getUtcDate = (parts: StudioDateParts | null): Date | null => {
  if (!parts) return null;
  return new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
};

const getLocalizedDate = (
  parts: StudioDateParts | null,
  options: { includeYear: boolean; locale?: string },
) => {
  const date = getUtcDate(parts);
  if (!date) return "";

  const formatter = new Intl.DateTimeFormat(options.locale, {
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
  locale?: string,
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
    return getLocalizedDate(parts, { includeYear: false, locale });
  }
  if (token === "localizedWithYear") {
    return getLocalizedDate(parts, { includeYear: true, locale });
  }

  return null;
};

export const resolveStudioDateTemplate = ({
  template,
  start,
  end,
  primary = start ?? end,
  locale,
}: {
  template: string;
  start?: StudioDateParts | null;
  end?: StudioDateParts | null;
  primary?: StudioDateParts | null;
  locale?: string;
}) =>
  template.replace(/\$\{\s*([A-Za-z.]+)\s*\}/g, (match, rawToken) => {
    const token = String(rawToken);
    const [namespace, ...tokenParts] = token.split(".");

    if ((namespace === "start" || namespace === "end") && tokenParts.length) {
      const value = formatStudioDateToken(
        namespace === "start" ? (start ?? null) : (end ?? null),
        tokenParts.join("."),
        locale,
      );
      return value ?? match;
    }

    const value = formatStudioDateToken(primary ?? null, token, locale);
    return value ?? match;
  });

export const getStudioDateFormatPresets = (
  mode: StudioDateFormatMode = "range",
) =>
  mode === "single"
    ? STUDIO_SINGLE_DATE_FORMAT_PRESETS
    : STUDIO_WEEK_DATE_FORMAT_PRESETS;

export const getStudioDateFormatPreset = (
  format: string | undefined,
  mode: StudioDateFormatMode = "range",
) =>
  getStudioDateFormatPresets(mode).find(
    (candidate) => candidate.id === format,
  ) ?? null;

export const getStudioDateTemplateTokens = (
  mode: StudioDateFormatMode = "range",
) =>
  mode === "single"
    ? STUDIO_SINGLE_DATE_TEMPLATE_TOKENS
    : STUDIO_WEEK_DATE_TEMPLATE_TOKENS;

export const getStudioDateTemplateValue = (
  format?: string,
  template?: string,
  mode: StudioDateFormatMode = "range",
): string => {
  const presets = getStudioDateFormatPresets(mode);
  const selectedTemplate = template?.trimEnd();
  if (selectedTemplate) return selectedTemplate;

  return (
    getStudioDateFormatPreset(format, mode)?.template ??
    presets[0]?.template ??
    ""
  );
};

export const getStudioDateFormatPresetValue = (
  format?: string,
  template?: string,
  mode: StudioDateFormatMode = "range",
): string => {
  const presets = getStudioDateFormatPresets(mode);
  if (!template) {
    const selectedFormat = format ?? presets[0]?.id;
    if (getStudioDateFormatPreset(selectedFormat, mode)) {
      return selectedFormat ?? "custom";
    }
  }

  return presets.find((preset) => preset.template === template)?.id ?? "custom";
};

export const getStudioWeekDatePreset = (format: string) =>
  STUDIO_WEEK_DATE_FORMAT_PRESETS.find((preset) => preset.id === format) ??
  null;

export const getStudioWeekDateTemplateValue = (
  format?: string,
  template?: string,
): string => getStudioDateTemplateValue(format, template, "range");

export const getStudioWeekDatePresetValue = (
  format?: string,
  template?: string,
): string => getStudioDateFormatPresetValue(format, template, "range");

export const getStudioSingleDatePreset = (format: string) =>
  getStudioDateFormatPreset(format, "single");

export const getStudioSingleDateTemplateValue = (
  format?: string,
  template?: string,
): string => getStudioDateTemplateValue(format, template, "single");

export const getStudioSingleDatePresetValue = (
  format?: string,
  template?: string,
): string => getStudioDateFormatPresetValue(format, template, "single");

/** timetable과 Thumbnail이 공유하는 순수 날짜 범위 resolver. */
export const resolveStudioDateRangeText = ({
  startDate,
  endDate,
  dayCount = 7,
  format,
  template,
  locale,
}: StudioDateRangeResolverOptions = {}) => {
  const { start, end } = getStudioDateRangeParts({
    startDate,
    endDate,
    dayCount,
  });
  if (!start && !end) return "";

  return resolveStudioDateTemplate({
    template: getStudioWeekDateTemplateValue(format, template),
    start,
    end,
    primary: start ?? end,
    locale,
  });
};

export const resolveStudioSingleDateText = ({
  date,
  format,
  template,
  locale,
}: {
  date?: string;
  format?: string;
  template?: string;
  locale?: string;
} = {}) => {
  const primary = parseStudioIsoDateParts(date);
  if (!primary) return "";

  return resolveStudioDateTemplate({
    template: getStudioSingleDateTemplateValue(format, template),
    start: primary,
    primary,
    locale,
  });
};

export const resolveStudioWeekDateText = (
  document: StudioTemplateDocument,
  options: {
    format?: string;
    template?: string;
    startDate?: string;
    locale?: string;
  } = {},
) => {
  const start = getStudioWeekStartParts(document, options.startDate);
  const end = getStudioWeekEndParts(document, options.startDate);
  if (!start && !end) return "";

  return resolveStudioDateTemplate({
    template: getStudioWeekDateTemplateValue(options.format, options.template),
    start,
    end,
    primary: start ?? end,
    locale: options.locale,
  });
};

export const isStudioWeekDateFormatPresetId = (
  value: string,
): value is StudioWeekDateFormatPresetId =>
  STUDIO_WEEK_DATE_FORMAT_PRESETS.some((preset) => preset.id === value);

export const isStudioSingleDateFormatPresetId = (
  value: string,
): value is StudioSingleDateFormatPresetId =>
  STUDIO_SINGLE_DATE_FORMAT_PRESETS.some((preset) => preset.id === value);
