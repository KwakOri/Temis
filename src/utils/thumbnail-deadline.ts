const THUMBNAIL_TIME_ZONE = "Asia/Seoul";
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const THUMBNAIL_DEADLINE_WEEKDAYS = [0, 4] as const;

type CalendarDate = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const getCalendarDateInTimeZone = (date: Date): CalendarDate => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: THUMBNAIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: WEEKDAY_NAMES.indexOf(
      values.weekday as (typeof WEEKDAY_NAMES)[number],
    ),
  };
};

const toUtcDate = (calendarDate: Omit<CalendarDate, "weekday">) =>
  new Date(
    Date.UTC(calendarDate.year, calendarDate.month - 1, calendarDate.day),
  );

const parseDateInputValue = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = toUtcDate({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  });
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() + 1 !== Number(match[2]) ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
};

const formatDateInputValue = (date: Date) =>
  [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((value, index) =>
      index === 0 ? String(value) : String(value).padStart(2, "0"),
    )
    .join("-");

const getDaysUntilWeekday = (
  currentWeekday: number,
  targetWeekday: number,
  includeToday: boolean,
) => {
  const days = (targetWeekday - currentWeekday + 7) % 7;
  return days === 0 && !includeToday ? 7 : days;
};

const getClosestScheduledDate = (today: Date, weekday: number) => {
  const days = Math.min(
    ...THUMBNAIL_DEADLINE_WEEKDAYS.map((targetWeekday) =>
      getDaysUntilWeekday(weekday, targetWeekday, true),
    ),
  );
  return addDays(today, days);
};

const getInitialEstimatedDeadline = (today: CalendarDate) => {
  const todayDate = toUtcDate(today);

  // 월·화에는 임박한 목요일을 건너뛰고 일요일 슬롯을 제안합니다.
  if (today.weekday === 1 || today.weekday === 2) {
    return addDays(todayDate, getDaysUntilWeekday(today.weekday, 0, true));
  }

  // 금·토에는 임박한 일요일을 건너뛰고 다음 목요일 슬롯을 제안합니다.
  if (today.weekday === 5 || today.weekday === 6) {
    return addDays(todayDate, getDaysUntilWeekday(today.weekday, 4, true));
  }

  return getClosestScheduledDate(todayDate, today.weekday);
};

const getNextEstimatedDeadline = (baseDate: Date) => {
  const weekday = baseDate.getUTCDay();
  const days = Math.min(
    ...THUMBNAIL_DEADLINE_WEEKDAYS.map((targetWeekday) =>
      getDaysUntilWeekday(weekday, targetWeekday, false),
    ),
  );
  return addDays(baseDate, days);
};

export const getThumbnailEstimatedDeadline = (
  now: Date = new Date(),
  latestDeadline: string | null = null,
) => {
  const today = getCalendarDateInTimeZone(now);
  const todayDate = toUtcDate(today);
  const parsedLatestDeadline = latestDeadline
    ? parseDateInputValue(latestDeadline)
    : null;

  if (parsedLatestDeadline) {
    const baseDate =
      parsedLatestDeadline.getTime() >= todayDate.getTime()
        ? parsedLatestDeadline
        : todayDate;
    return formatDateInputValue(getNextEstimatedDeadline(baseDate));
  }

  return formatDateInputValue(getInitialEstimatedDeadline(today));
};
