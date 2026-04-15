import {
  TLanOpt,
} from "@/types/time-table/data";
import {
  v2_TEMPLATE_DAY_KEYS,
  V2TemplateComputedBindingKey,
  V2TemplateDayKey,
  V2TemplateDayLabelFormat,
  V2TemplateRenderConfig,
  V2TemplateStreamingDayFormat,
  V2TemplateStreamingTimeFormat,
  V2TemplateTextCaseStyle,
  V2TemplateWeekDateFormat,
} from "@/types/time-table/template-render-config";
import { weekdays } from "@/utils/time-table/data";

const v2_LOCALE_MAP: Record<TLanOpt, string> = {
  en: "en-US",
  kr: "ko-KR",
  jp: "ja-JP",
};

const v2_DAY_INDEX_BY_KEY: Record<V2TemplateDayKey, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

const v2_DAY_LABEL_DICTIONARY: Record<
  TLanOpt,
  Record<"narrow" | "short" | "long", string[]>
> = {
  en: {
    narrow: ["M", "T", "W", "T", "F", "S", "S"],
    short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    long: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  },
  kr: {
    narrow: ["월", "화", "수", "목", "금", "토", "일"],
    short: ["월", "화", "수", "목", "금", "토", "일"],
    long: ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"],
  },
  jp: {
    narrow: ["月", "火", "水", "木", "金", "土", "日"],
    short: ["月", "火", "水", "木", "金", "土", "日"],
    long: ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"],
  },
};

const v2_DEFAULT_STREAMING_DAY_FORMAT: V2TemplateStreamingDayFormat = {
  locale: "en",
  width: "short",
  caseStyle: "original",
  custom: {},
};

const v2_DEFAULT_STREAMING_TIME_FORMAT: V2TemplateStreamingTimeFormat = {
  hourCycle: "h12",
  padHour: true,
  showMeridiem: true,
  meridiemStyle: "upper",
  meridiemPosition: "prefix",
  meridiemSeparator: " ",
  timeSeparator: ":",
};

const v2_DEFAULT_WEEK_DATE_FORMAT: V2TemplateWeekDateFormat = {
  locale: "en",
  dateOrder: "ymd",
  includeYear: true,
  yearStyle: "numeric",
  monthStyle: "2-digit",
  dateStyle: "2-digit",
  caseStyle: "original",
  dateSeparator: ".",
  monthDateSeparator: " ",
  rangeSeparator: " - ",
};

const v2_toSafeDate = (value: unknown): Date | null => {
  if (!(value instanceof Date)) return null;
  if (Number.isNaN(value.getTime())) return null;
  return value;
};

const v2_stringOrFallback = (value: string | undefined, fallback: string): string => {
  return typeof value === "string" ? value : fallback;
};

export const v2_applyTextCaseStyle = (
  value: string,
  caseStyle: V2TemplateTextCaseStyle
): string => {
  if (!value) return value;

  if (caseStyle === "upper") return value.toUpperCase();
  if (caseStyle === "lower") return value.toLowerCase();
  if (caseStyle === "capitalize") {
    const lower = value.toLowerCase();
    return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
  }

  return value;
};

const v2_toDayFormatFromLegacy = ({
  dayLabelFormat,
  fallbackWeekdayOption,
}: {
  dayLabelFormat?: V2TemplateDayLabelFormat;
  fallbackWeekdayOption?: TLanOpt;
}): V2TemplateStreamingDayFormat => {
  const locale = dayLabelFormat?.preset ?? fallbackWeekdayOption ?? "en";
  return {
    ...v2_DEFAULT_STREAMING_DAY_FORMAT,
    locale,
    custom: {
      ...(dayLabelFormat?.custom ?? {}),
    },
  };
};

export const v2_resolveStreamingDayLabelByKey = ({
  dayKey,
  streamingDayFormat,
  dayLabelFormat,
  fallbackWeekdayOption,
}: {
  dayKey: V2TemplateDayKey;
  streamingDayFormat?: V2TemplateStreamingDayFormat;
  dayLabelFormat?: V2TemplateDayLabelFormat;
  fallbackWeekdayOption?: TLanOpt;
}): string => {
  const effectiveFormat = streamingDayFormat
    ? {
        ...v2_DEFAULT_STREAMING_DAY_FORMAT,
        ...streamingDayFormat,
      }
    : v2_toDayFormatFromLegacy({ dayLabelFormat, fallbackWeekdayOption });

  const custom = effectiveFormat.custom?.[dayKey];
  if (typeof custom === "string" && custom.trim().length > 0) {
    return custom.trim();
  }

  const dayIndex = v2_DAY_INDEX_BY_KEY[dayKey];
  const locale = effectiveFormat.locale;
  const width = effectiveFormat.width;
  const dictionary =
    v2_DAY_LABEL_DICTIONARY[locale]?.[width] ??
    v2_DAY_LABEL_DICTIONARY.en.short;
  const baseLabel = dictionary[dayIndex] ?? weekdays.en[dayIndex] ?? "";
  return v2_applyTextCaseStyle(baseLabel, effectiveFormat.caseStyle);
};

const v2_toPaddedNumber = (
  value: number,
  style: "numeric" | "2-digit"
): string => {
  if (style === "2-digit") return String(value).padStart(2, "0");
  return String(value);
};

const v2_toDateOrder = (
  format: V2TemplateWeekDateFormat
): "ymd" | "mdy" | "dmy" => {
  if (format.dateOrder !== "locale") {
    return format.dateOrder;
  }

  if (format.locale === "en") return "mdy";
  return "ymd";
};

const v2_formatMonthByStyle = ({
  date,
  format,
}: {
  date: Date;
  format: V2TemplateWeekDateFormat;
}): string => {
  const monthNumber = date.getMonth() + 1;

  if (format.monthStyle === "numeric" || format.monthStyle === "2-digit") {
    return v2_toPaddedNumber(monthNumber, format.monthStyle);
  }

  const locale = v2_LOCALE_MAP[format.locale] ?? "en-US";
  const formatter = new Intl.DateTimeFormat(locale, {
    month: format.monthStyle,
  });
  return v2_applyTextCaseStyle(formatter.format(date), format.caseStyle);
};

const v2_formatWeekDateParts = ({
  date,
  format,
}: {
  date: Date;
  format: V2TemplateWeekDateFormat;
}) => {
  const yearRaw = date.getFullYear();
  const year =
    format.yearStyle === "2-digit"
      ? String(yearRaw % 100).padStart(2, "0")
      : String(yearRaw);
  const month = v2_formatMonthByStyle({ date, format });
  const datePart = v2_toPaddedNumber(date.getDate(), format.dateStyle);

  const order = v2_toDateOrder(format);
  const fullDate = (() => {
    if (!format.includeYear) {
      if (order === "dmy") {
        return `${datePart}${format.monthDateSeparator}${month}`;
      }
      return `${month}${format.monthDateSeparator}${datePart}`;
    }

    if (order === "mdy") {
      return [month, datePart, year].join(format.dateSeparator);
    }
    if (order === "dmy") {
      return [datePart, month, year].join(format.dateSeparator);
    }
    return [year, month, datePart].join(format.dateSeparator);
  })();

  const monthDate =
    order === "dmy"
      ? `${datePart}${format.monthDateSeparator}${month}`
      : `${month}${format.monthDateSeparator}${datePart}`;

  return {
    year,
    month,
    date: datePart,
    monthDate,
    fullDate,
  };
};

const v2_resolveWeekDateRange = (
  weekDates: Date[]
): { start: Date; end: Date } | null => {
  const validDates = weekDates
    .map((date) => v2_toSafeDate(date))
    .filter((date): date is Date => Boolean(date));
  if (validDates.length === 0) return null;

  return {
    start: validDates[0],
    end: validDates[validDates.length - 1],
  };
};

export const v2_buildWeekDateComputedValues = ({
  weekDates,
  weekDateFormat,
}: {
  weekDates: Date[];
  weekDateFormat?: V2TemplateWeekDateFormat;
}): Pick<
  Record<V2TemplateComputedBindingKey, string>,
  | "weekDateRange"
  | "weekStartYear"
  | "weekStartMonth"
  | "weekStartDate"
  | "weekStartMonthDate"
  | "weekStartFullDate"
  | "weekEndYear"
  | "weekEndMonth"
  | "weekEndDate"
  | "weekEndMonthDate"
  | "weekEndFullDate"
> => {
  const format = {
    ...v2_DEFAULT_WEEK_DATE_FORMAT,
    ...(weekDateFormat ?? {}),
    dateSeparator: v2_stringOrFallback(weekDateFormat?.dateSeparator, "."),
    monthDateSeparator: v2_stringOrFallback(weekDateFormat?.monthDateSeparator, " "),
    rangeSeparator: v2_stringOrFallback(weekDateFormat?.rangeSeparator, " - "),
  };

  const empty = {
    weekDateRange: "",
    weekStartYear: "",
    weekStartMonth: "",
    weekStartDate: "",
    weekStartMonthDate: "",
    weekStartFullDate: "",
    weekEndYear: "",
    weekEndMonth: "",
    weekEndDate: "",
    weekEndMonthDate: "",
    weekEndFullDate: "",
  };

  const range = v2_resolveWeekDateRange(weekDates);
  if (!range) return empty;

  const start = v2_formatWeekDateParts({
    date: range.start,
    format,
  });
  const end = v2_formatWeekDateParts({
    date: range.end,
    format,
  });

  return {
    weekDateRange: `${start.fullDate}${format.rangeSeparator}${end.fullDate}`,
    weekStartYear: start.year,
    weekStartMonth: start.month,
    weekStartDate: start.date,
    weekStartMonthDate: start.monthDate,
    weekStartFullDate: start.fullDate,
    weekEndYear: end.year,
    weekEndMonth: end.month,
    weekEndDate: end.date,
    weekEndMonthDate: end.monthDate,
    weekEndFullDate: end.fullDate,
  };
};

export const v2_buildStreamingTimeComputedValues = ({
  time,
  isGuerrilla,
  streamingTimeFormat,
}: {
  time: string;
  isGuerrilla: boolean;
  streamingTimeFormat?: V2TemplateStreamingTimeFormat;
}): Pick<
  Record<V2TemplateComputedBindingKey, string>,
  "streamingTime" | "streamingTimeHour" | "streamingTimeMinute" | "streamingTimeMeridiem"
> => {
  if (isGuerrilla) {
    return {
      streamingTime: "게릴라",
      streamingTimeHour: "",
      streamingTimeMinute: "",
      streamingTimeMeridiem: "",
    };
  }

  const format = {
    ...v2_DEFAULT_STREAMING_TIME_FORMAT,
    ...(streamingTimeFormat ?? {}),
    meridiemSeparator: v2_stringOrFallback(
      streamingTimeFormat?.meridiemSeparator,
      " "
    ),
    timeSeparator: v2_stringOrFallback(streamingTimeFormat?.timeSeparator, ":"),
  };

  const [hourRaw, minuteRaw] = String(time).split(":");
  const hourValue = Number(hourRaw);
  const minuteValue = Number(minuteRaw);

  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) {
    return {
      streamingTime: String(time ?? ""),
      streamingTimeHour: "",
      streamingTimeMinute: "",
      streamingTimeMeridiem: "",
    };
  }

  const normalizedHour = Math.max(0, Math.min(23, Math.floor(hourValue)));
  const normalizedMinute = Math.max(0, Math.min(59, Math.floor(minuteValue)));

  const meridiem = (() => {
    const isPm = normalizedHour >= 12;
    if (format.meridiemStyle === "kr") {
      return isPm ? "오후" : "오전";
    }
    if (format.meridiemStyle === "lower") {
      return isPm ? "pm" : "am";
    }
    return isPm ? "PM" : "AM";
  })();

  const hourForDisplay =
    format.hourCycle === "h24"
      ? normalizedHour
      : normalizedHour % 12 === 0
        ? 12
        : normalizedHour % 12;
  const hour = format.padHour
    ? String(hourForDisplay).padStart(2, "0")
    : String(hourForDisplay);
  const minute = String(normalizedMinute).padStart(2, "0");
  const shouldShowMeridiem = format.hourCycle === "h12" && format.showMeridiem;

  const base = `${hour}${format.timeSeparator}${minute}`;
  const display =
    shouldShowMeridiem && meridiem
      ? format.meridiemPosition === "suffix"
        ? `${base}${format.meridiemSeparator}${meridiem}`
        : `${meridiem}${format.meridiemSeparator}${base}`
      : base;

  return {
    streamingTime: display,
    streamingTimeHour: hour,
    streamingTimeMinute: minute,
    streamingTimeMeridiem: shouldShowMeridiem ? meridiem : "",
  };
};

export const v2_formatStreamingDate = ({
  date,
  weekDateFormat,
}: {
  date: Date | null | undefined;
  weekDateFormat?: V2TemplateWeekDateFormat;
}): string => {
  const safeDate = v2_toSafeDate(date);
  if (!safeDate) return "";

  const style = weekDateFormat?.dateStyle ?? "2-digit";
  return v2_toPaddedNumber(safeDate.getDate(), style);
};

export const v2_buildComputedValues = ({
  dayKey,
  weekDate,
  weekDates,
  entryTime,
  isGuerrilla,
  renderConfig,
}: {
  dayKey: V2TemplateDayKey;
  weekDate?: Date | null;
  weekDates: Date[];
  entryTime: string;
  isGuerrilla: boolean;
  renderConfig: V2TemplateRenderConfig;
}): Partial<Record<V2TemplateComputedBindingKey, string>> => {
  const streamingDay = v2_resolveStreamingDayLabelByKey({
    dayKey,
    streamingDayFormat: renderConfig.streamingDayFormat,
    dayLabelFormat: renderConfig.dayLabelFormat,
    fallbackWeekdayOption: renderConfig.weekdayOption,
  });

  const streamingDate = v2_formatStreamingDate({
    date: weekDate,
    weekDateFormat: renderConfig.weekDateFormat,
  });

  const streamingTime = v2_buildStreamingTimeComputedValues({
    time: entryTime,
    isGuerrilla,
    streamingTimeFormat: renderConfig.streamingTimeFormat,
  });

  const weekDateComputed = v2_buildWeekDateComputedValues({
    weekDates,
    weekDateFormat: renderConfig.weekDateFormat,
  });

  return {
    streamingDay,
    streamingDate,
    ...streamingTime,
    ...weekDateComputed,
  };
};
