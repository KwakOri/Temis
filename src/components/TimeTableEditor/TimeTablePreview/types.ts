import type { Data } from "../TimeTableEditor";

export interface TimeTablePreviewProps {
  scale: number;
  data: Data[];
  weekDates: Date[];
  imageSrc: string | null;
}

export const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
export const profileImageHeight = 640 * 1.5;
export const profileImageWidth = 360 * 1.5;
