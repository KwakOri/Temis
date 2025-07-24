export interface Data {
  day: number;
  isHoliday: boolean;
  time: string;
  topic: string;
  description: string;
}

export type ThemeTypes = "blue" | "yellow" | "pink";

export const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Oct",
  "Nov",
  "Dec",
];
export const profileImageHeight = 720;
export const profileImageWidth = 515;
