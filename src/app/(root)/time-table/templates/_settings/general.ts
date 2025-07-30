import { getInitialCard, initialCard, TInitialCard } from "./settings";

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

export interface TDefaultCard extends TInitialCard {
  day: number;
}

// 확장된 카드 타입 (settings.ts의 동적 필드 지원)
export interface TExtendedCard extends TDefaultCard {
  // 인덱스 시그니처로 동적 필드 지원
  [key: string]:
    | string
    | number
    | boolean
    | Array<{ text: string; checked: boolean }>
    | undefined;
}

export const week = [0, 1, 2, 3, 4, 5, 6];
export const defaultCards: TDefaultCard[] = week.map((day) => {
  return {
    day,
    ...getInitialCard(),
  } as TDefaultCard;
});

// 레거시 지원을 위한 기존 defaultCards (사용 비추천)
export const defaultCardsLegacy: TDefaultCard[] = week.map((day) => {
  return {
    day,
    ...initialCard,
  };
});

