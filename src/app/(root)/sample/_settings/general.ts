import { getInitialCard, TDynamicCard } from "./settings";

// settings.ts에서 getInitialCard를 re-export
export { getInitialCard } from "./settings";

export const weekdays = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  kr: ["월", "화", "수", "목", "금", "토", "일"],
  jp: ["月", "火", "水", "木", "金", "土", "日"],
};
export const months = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  kr: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  jp: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
};

export interface TDefaultCard extends TDynamicCard {
  day: number;
}

// 확장된 카드 타입 (settings.ts의 동적 필드 지원)
// TDynamicCard가 이미 동적 필드를 지원하므로 TDefaultCard를 그대로 사용

export const week = [0, 1, 2, 3, 4, 5, 6];
export const defaultCards: TDefaultCard[] = week.map((day) => {
  return {
    day,
    ...getInitialCard(),
  } as TDefaultCard;
});
