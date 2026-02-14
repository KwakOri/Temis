/**
 * Date formatting utility functions
 * Provides comprehensive date formatting and week date range functionality
 */

export type MonthCase = 'initial' | 'upper' | 'lower';

export interface DateInfo {
  year: number;
  month: number;
  date: number;
  full: string; // Formatted as "YYYY.MM.DD"
  monthEn: {
    initial: string; // "Jan", "Feb", etc.
    upper: string; // "JAN", "FEB", etc.
    lower: string; // "jan", "feb", etc.
  };
}

export interface WeekDateRange {
  start: DateInfo;
  end: DateInfo;
}

/**
 * Month names in English
 */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Short month names in English
 */
const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Pads single digit numbers with leading zero
 * @param num - Number to pad
 * @returns Padded string
 */
export function padZero(num: number): string {
  return num < 10 ? `0${num}` : num.toString();
}

/**
 * Gets English month name in different cases
 * @param monthIndex - Month index (0-11)
 * @param useShort - Use short month names (Jan, Feb, etc.)
 * @returns Object with different case variations
 */
export function getMonthEn(
  monthIndex: number,
  useShort: boolean = true
): DateInfo['monthEn'] {
  const monthName = useShort
    ? SHORT_MONTH_NAMES[monthIndex]
    : MONTH_NAMES[monthIndex];

  return {
    initial: monthName, // First letter capitalized
    upper: monthName.toUpperCase(),
    lower: monthName.toLowerCase(),
  };
}

/**
 * Converts Date object to DateInfo object
 * @param date - Date object
 * @param useShortMonth - Use short month names (default: true)
 * @returns DateInfo object with year, month, date, full format, and English month variations
 */
function dateToDateInfo(date: Date, useShortMonth: boolean = true): DateInfo {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const dateNum = date.getDate();

  return {
    year,
    month,
    date: dateNum,
    full: `${year}.${padZero(month)}.${padZero(dateNum)}`,
    monthEn: getMonthEn(date.getMonth(), useShortMonth),
  };
}

/**
 * Gets week date range from an array of week dates
 * @param weekDates - Array of 7 Date objects representing a week (Monday to Sunday)
 * @param useShortMonth - Use short month names (default: true)
 * @returns WeekDateRange object with start and end date information
 */
export function getWeekDateRange(
  weekDates: Date[],
  useShortMonth: boolean = true
): WeekDateRange {
  if (weekDates.length !== 7) {
    throw new Error('weekDates must contain exactly 7 dates');
  }

  return {
    start: dateToDateInfo(weekDates[0], useShortMonth), // Monday
    end: dateToDateInfo(weekDates[6], useShortMonth), // Sunday
  };
}

/**
 * Formats a single date as "YYYY.MM.DD"
 * @param date - Date object or DateInfo object
 * @param useShortMonth - Use short month names when converting Date object
 * @returns Formatted date string
 */
export function formatDateString(
  date: Date | DateInfo,
  useShortMonth: boolean = true
): string {
  if (date instanceof Date) {
    return dateToDateInfo(date, useShortMonth).full;
  }
  return date.full;
}

/**
 * Gets formatted week range string "YYYY.MM.DD - YYYY.MM.DD"
 * @param weekDates - Array of 7 Date objects representing a week
 * @param useShortMonth - Use short month names (default: true)
 * @returns Formatted week range string
 */
export function getFormattedWeekRange(
  weekDates: Date[],
  useShortMonth: boolean = true
): string {
  const weekRange = getWeekDateRange(weekDates, useShortMonth);
  return `${weekRange.start.full} - ${weekRange.end.full}`;
}

/**
 * Gets formatted week range string with English months
 * @param weekDates - Array of 7 Date objects representing a week
 * @param monthCase - Case format for month names ('initial', 'upper', 'lower')
 * @param useShortMonth - Use short month names (default: true)
 * @returns Formatted week range string with English month names
 */
export function getFormattedWeekRangeEn(
  weekDates: Date[],
  monthCase: MonthCase = 'initial',
  useShortMonth: boolean = true
): string {
  const weekRange = getWeekDateRange(weekDates, useShortMonth);
  const startMonth = weekRange.start.monthEn[monthCase];
  const endMonth = weekRange.end.monthEn[monthCase];

  return `${startMonth} ${weekRange.start.date}, ${weekRange.start.year} - ${endMonth} ${weekRange.end.date}, ${weekRange.end.year}`;
}

/**
 * Gets formatted single date string with English month
 * @param date - Date object or DateInfo object
 * @param monthCase - Case format for month names ('initial', 'upper', 'lower')
 * @param useShortMonth - Use short month names when converting Date object
 * @returns Formatted date string with English month
 */
export function formatDateStringEn(
  date: Date | DateInfo,
  monthCase: MonthCase = 'initial',
  useShortMonth: boolean = true
): string {
  const dateInfo =
    date instanceof Date ? dateToDateInfo(date, useShortMonth) : date;
  const monthEn = dateInfo.monthEn[monthCase];

  return `${monthEn} ${dateInfo.date}, ${dateInfo.year}`;
}

/**
 * Legacy date formatter function (for backward compatibility)
 * @param date - Date number
 * @returns Padded date string
 * @deprecated Use padZero instead
 */
export function dateFormatter(date: number): string {
  return padZero(date);
}
