/**
 * Time formatting utility functions
 * Supports both 12-hour (half) and 24-hour (full) time formats
 */

export type TimeFormat = "half" | "full";

/**
 * Formats time string according to specified format
 * @param time - Time string in "HH:MM" format (24-hour)
 * @param format - 'half' for 12-hour with AM/PM, 'full' for 24-hour
 * @param padZero - Whether to pad single digit hours with leading zero (default: true)
 * @returns Formatted time string
 */
export function formatTime(
  time: string,
  format: TimeFormat = "half",
  padZero: boolean = true
): string {
  const [hourStr, minute] = time.split(":");
  const hour = Number(hourStr);

  if (format === "full") {
    // 24-hour format: pad with zero if needed based on option
    const formattedHour = padZero
      ? hour.toString().padStart(2, "0")
      : hour.toString();
    return `${formattedHour}:${minute}`;
  }

  // 12-hour format with AM/PM
  const isAfternoon = hour >= 12;
  let displayHour = hour;

  // Convert to 12-hour format
  if (hour === 0) {
    displayHour = 12; // Midnight 0:00 -> AM 12:00
  } else if (hour > 12) {
    displayHour = hour - 12; // 13:00+ -> PM 1:00+
  }
  // 12:00 (noon) stays as PM 12:00

  const amPm = isAfternoon ? "PM" : "AM";
  const formattedHour = padZero
    ? displayHour.toString().padStart(2, "0")
    : displayHour.toString();

  return `${amPm} ${formattedHour}:${minute}`;
}

/**
 * Formats streaming time with AM/PM (legacy function for backward compatibility)
 * @param time - Time string in "HH:MM" format
 * @param padZero - Whether to pad single digit hours with leading zero (default: true)
 * @returns Formatted time string with AM/PM
 * @deprecated Use formatTime(time, 'half', padZero) instead
 */
export function getFormattedStreamingTime(
  time: string,
  padZero: boolean = true
): string {
  return formatTime(time, "half", padZero);
}

/**
 * Formats time in 24-hour format
 * @param time - Time string in "HH:MM" format
 * @param padZero - Whether to pad single digit hours with leading zero (default: true)
 * @returns Formatted time string in 24-hour format
 */
export function getFormatted24HourTime(
  time: string,
  padZero: boolean = true
): string {
  return formatTime(time, "full", padZero);
}
