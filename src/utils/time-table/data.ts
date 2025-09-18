import {
  CardInputConfig,
  TDefaultCard,
  TDynamicCard,
  TEntry,
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

export interface CreateInitialCardFromConfigProps {
  cardInputConfig: CardInputConfig;
}

// 개별 엔트리 생성 함수
export const createInitialEntryFromConfig = ({
  cardInputConfig,
}: CreateInitialCardFromConfigProps): TEntry => {
  // 필수 속성부터 초기화 (TEntry 타입의 필수 속성)
  const entry: TEntry = {
    time: "09:00",
    mainTitle: "",
  };

  // CARD_INPUT_CONFIG의 모든 필드를 기반으로 기본값 설정
  cardInputConfig.fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      entry[field.key] = field.defaultValue;
    } else {
      // 타입에 따른 기본값 설정
      switch (field.type) {
        case "text":
        case "textarea":
        case "select":
          entry[field.key] = "";
          break;
        case "number":
          entry[field.key] = 0;
          break;
        case "time":
          entry[field.key] = "09:00";
          break;
        default:
          entry[field.key] = "";
      }
    }
  });

  return entry;
};

export const createInitialCardFromConfig = ({
  cardInputConfig,
}: CreateInitialCardFromConfigProps): TDynamicCard => {
  // 기본 엔트리 하나를 가진 카드 생성
  const initialEntry = createInitialEntryFromConfig({ cardInputConfig });

  const card: TDynamicCard = {
    isOffline: false,
    entries: [initialEntry],
  };

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

// 기본 카드 입력 설정 (time과 mainTitle 필수 포함)
export const CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: "time",
      type: "time",
      placeholder: "21:00",
      required: true,
      defaultValue: "21:00",
    },
    {
      key: "mainTitle",
      type: "textarea",
      placeholder: "메인 제목\n적는곳",
      defaultValue: "",
      maxLength: 200,
    },
  ],
  showLabels: false, // 라벨 표시 여부
  // 오프라인 토글 설정
  offlineToggle: {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  },
};
