const THUMBNAIL_TIME_ZONE = "Asia/Seoul";
const THUMBNAIL_DAYS_PER_PENDING_ORDER = 2;

type CalendarDate = {
  year: number;
  month: number;
  day: number;
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
  };
};

const toUtcDate = (calendarDate: CalendarDate) =>
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

export const getThumbnailEstimatedDeadline = (
  now: Date = new Date(),
  latestDeadline: string | null = null,
  pendingOrderCount = 0,
) => {
  const today = getCalendarDateInTimeZone(now);
  const todayDate = toUtcDate(today);
  const parsedLatestDeadline = latestDeadline
    ? parseDateInputValue(latestDeadline)
    : null;
  const baseDate =
    parsedLatestDeadline &&
    parsedLatestDeadline.getTime() >= todayDate.getTime()
      ? parsedLatestDeadline
      : todayDate;
  const safePendingOrderCount = Math.max(0, pendingOrderCount);

  return formatDateInputValue(
    addDays(baseDate, safePendingOrderCount * THUMBNAIL_DAYS_PER_PENDING_ORDER),
  );
};
