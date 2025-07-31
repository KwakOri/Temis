import { CARD_INPUT_CONFIG, Themes } from "./settings";

// 동적 타입 정의들 (settings.ts에서 이동)
export type TTheme = (typeof Themes)[number];

export interface TButtonTheme {
  value: TTheme;
  label: string;
}

// 개발자용 간단한 필드 타입 정의
export interface SimpleFieldConfig {
  key: string;
  type: "text" | "textarea" | "time" | "select" | "number";
  label?: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
}

// 카드 필드 구성 (개발자만 수정)
export interface CardInputConfig {
  fields: SimpleFieldConfig[];
  showLabels?: boolean;
  // 오프라인 토글 설정
  offlineToggle?: {
    label: string;
    activeColor: string;
    inactiveColor: string;
  };
}

// CARD_INPUT_CONFIG 기반 동적 카드 타입 정의
export type TDynamicCard = {
  isOffline: boolean; // 기본 속성
} & {
  [K in (typeof CARD_INPUT_CONFIG.fields)[number]["key"]]?:  // ? 추가
    | string
    | number
    | boolean;
} & {
  // 확장 가능한 필드 지원 (TExtendedCard 호환성)
  [key: string]:
    | string
    | number
    | boolean
    | Array<{ text: string; checked: boolean }>
    | undefined; // undefined 추가
};

// 개발자용 필드 구성 조회 함수
export const getCardInputConfig = (): Readonly<CardInputConfig> => {
  return CARD_INPUT_CONFIG;
};

// CARD_INPUT_CONFIG만을 기반으로 초기 카드 생성 함수
export const createInitialCardFromConfig = (): TDynamicCard => {
  // isOffline은 카드의 기본 속성이므로 항상 포함
  const card: TDynamicCard = {
    isOffline: false,
  } as TDynamicCard;

  // CARD_INPUT_CONFIG의 모든 필드를 기반으로 기본값 설정
  CARD_INPUT_CONFIG.fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      card[field.key] = field.defaultValue;
    } else {
      // 타입에 따른 기본값 설정
      switch (field.type) {
        case "text":
        case "textarea":
        case "select":
          card[field.key] = "";
          break;
        case "number":
          card[field.key] = 0;
          break;
        case "time":
          card[field.key] = "09:00";
          break;
        default:
          card[field.key] = "";
      }
    }
  });

  return card;
};

// CARD_INPUT_CONFIG와 연동되는 초기 카드 (추천)
// 레거시 initialCard와는 달리 CARD_INPUT_CONFIG에 정의된 모든 필드를 포함
export const getInitialCard = (): TDynamicCard => createInitialCardFromConfig();

// CARD_INPUT_CONFIG에서 placeholders 객체를 동적으로 생성하는 함수
export const createPlaceholdersFromConfig = (): Record<string, string> => {
  const placeholders: Record<string, string> = {};

  CARD_INPUT_CONFIG.fields.forEach((field) => {
    placeholders[field.key] = field.placeholder;
  });

  return placeholders;
};

// CARD_INPUT_CONFIG 기반으로 생성된 placeholders
export const getConfigPlaceholders = (): Record<string, string> =>
  createPlaceholdersFromConfig();

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

export const placeholders: Record<string, string> = {
  // CARD_INPUT_CONFIG에서 동적으로 생성
  ...createPlaceholdersFromConfig(),
  // 추가 필드들 (CARD_INPUT_CONFIG에 없는 필드들)
  profileText: "사용자 이름",
};
