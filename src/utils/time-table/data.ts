import {
  CardInputConfig,
  TDynamicCard,
  TPlaceholders,
} from "@/types/time-table/data";
import { TButtonTheme } from "@/types/time-table/theme";

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

export const Themes = ["first", "second", "third"] as const;

export const getCardInputConfig = ({
  cardInputConfig,
}: {
  cardInputConfig: CardInputConfig;
}): Readonly<CardInputConfig> => {
  return cardInputConfig;
};

export interface CreatePlaceholdersFromConfigProps {
  cardInputConfig: CardInputConfig;
}

export const createPlaceholdersFromConfig = ({
  cardInputConfig,
}: CreatePlaceholdersFromConfigProps): Record<string, string> => {
  const placeholders: Record<string, string> = {};

  cardInputConfig.fields.forEach((field) => {
    placeholders[field.key] = field.placeholder;
  });

  return placeholders;
};

export interface GetPlaceholdersProps {
  cardInputConfig: CardInputConfig;
  profilePlaceholder: string;
}

export const getPlaceholders = ({
  cardInputConfig,
  profilePlaceholder,
}: GetPlaceholdersProps): TPlaceholders => {
  return {
    // CARD_INPUT_CONFIG에서 동적으로 생성
    ...createPlaceholdersFromConfig({ cardInputConfig }),
    // 추가 필드들 (CARD_INPUT_CONFIG에 없는 필드들)
    profileText: profilePlaceholder,
  };
};

export const week = [0, 1, 2, 3, 4, 5, 6];

export interface TDefaultCard extends TDynamicCard {
  day: number;
}

export interface CreateInitialCardFromConfigProps {
  cardInputConfig: CardInputConfig;
}

export const createInitialCardFromConfig = ({
  cardInputConfig,
}: CreateInitialCardFromConfigProps): TDynamicCard => {
  // isOffline은 카드의 기본 속성이므로 항상 포함
  const card: TDynamicCard = {
    isOffline: false,
  } as TDynamicCard;

  // CARD_INPUT_CONFIG의 모든 필드를 기반으로 기본값 설정
  cardInputConfig.fields.forEach((field) => {
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

export const getDefaultCards = ({
  cardInputConfig,
}: CreateInitialCardFromConfigProps): TDefaultCard[] => {
  return week.map((day) => {
    const card = {
      day,
      ...createInitialCardFromConfig({ cardInputConfig }),
    } as TDefaultCard;
    return card;
  });
};

export const buttonThemes: TButtonTheme[] = [
  { value: "first", label: "first" },
  { value: "second", label: "second" },
  { value: "third", label: "third" },
];

export const getFormattedTime = (time: string): string => {
  const timeArr = time.split("");
  if (timeArr[0] !== "0") return timeArr.join("");
  const temp = timeArr;
  temp.shift();
  return temp.join("");
};

export const offlineToggle = {
  label: "휴방",
  activeColor: "bg-[#3E4A82]",
  inactiveColor: "bg-gray-300",
};

export const fillZero = (num: number) => num.toString().padStart(2, "0");

export const isGuideEnabled =
  process.env.NEXT_PUBLIC_ENVIRONMENT === "development";
