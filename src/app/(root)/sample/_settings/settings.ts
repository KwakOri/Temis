import { TLanOpt } from "../_types/types";

/** ---------------------------------------------- */

/** Fonts 설정 */
/** Fonts 설정 */

/** _styles/index.css 에 먼저 폰트를 등록하고 작성해주세요. */

export const fontOption = {
  primary: "Ownglyph_ParkDaHyun",
  secondary: "LOTTERIACHAB",
  tertiary: "",
  quaternary: "",
};

/** ---------------------------------------------- */

/** 요일 표시 설정 */
/** 요일 표시 설정 */

/** kr | en | jp */

export const weekdayOption: TLanOpt = "en";
export const monthOption: TLanOpt = "en";

/** ---------------------------------------------- */

/** Theme 설정 */
/** Theme 설정 */

/** 단일 테마의 경우 normal로 통일하세요. */
/** _styles/colors.ts에 먼저 컬러 팔레트를 등록하세요. */

export type TTheme = "blue" | "yellow" | "pink";
export const defaultTheme: TTheme = "blue";
export interface TButtonTheme {
  value: TTheme;
  label: string;
}

export const buttonThemes: TButtonTheme[] = [
  { value: "blue", label: "파랑" },
  { value: "yellow", label: "노랑" },
  { value: "pink", label: "분홍" },
];

export const colors = {
  blue: {
    primary: "#0A5B7A",
    secondary: "#4F8DC2",
    tertiary: "#63A0D2",
    quaternary: "",
  },
  yellow: {
    primary: "#7A330A",
    secondary: "#C28E4F",
    tertiary: "#D2A063",
    quaternary: "",
  },
  pink: {
    primary: "#7A0A43",
    secondary: "#C24F75",
    tertiary: "#D26388",
    quaternary: "",
  },
};

/** ---------------------------------------------- */

/** Online 카드 구성 */
/** Online 카드 구성 */

export const onlineCardWidth: number = 188;
export const onlineCardHeight: number = 228;

// CARD_INPUT_CONFIG와 연동되는 초기 카드 (추천)
// 레거시 initialCard와는 달리 CARD_INPUT_CONFIG에 정의된 모든 필드를 포함
export const getInitialCard = (): Record<string, string | number | boolean> =>
  createInitialCardFromConfig();

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

// 개발자 전용: 카드 입력 필드 구성
// 이 부분만 수정하면 카드의 입력 필드가 변경됩니다
export const CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: "time",
      type: "time",
      placeholder: "00:00",
      required: true,
      defaultValue: "09:00",
    },
    {
      key: "topic",
      type: "text",
      placeholder: "소제목 적는 곳",
      maxLength: 50,
    },
    {
      key: "description",
      type: "textarea",
      placeholder: "내용 적는 곳",
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

// 개발자용 필드 구성 조회 함수
export const getCardInputConfig = (): Readonly<CardInputConfig> => {
  return CARD_INPUT_CONFIG;
};

// CARD_INPUT_CONFIG만을 기반으로 초기 카드 생성 함수
export const createInitialCardFromConfig = (): Record<
  string,
  string | number | boolean
> => {
  // isOffline은 카드의 기본 속성이므로 항상 포함
  const card: Record<string, string | number | boolean> = {
    isOffline: false,
  };

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

export type TInitialCard = {
  isOffline: boolean;
  time: string;
  topic: string;
  description: string;
};

export const initialCard: TInitialCard = {
  isOffline: false,
  time: "09:00",
  topic: "",
  description: "",
};

// 레거시 placeholders (하위 호환성을 위해 유지)
export const placeholders = {
  topic: "소제목 적는 곳",
  description: "내용 적는 곳",
  profileText: "사용자 이름",
};

/** ---------------------------------------------- */

/** Offline 카드 구성 */
/** Offline 카드 구성 */

export const offlineCardWidth: number = 188;
export const offlineCardHeight: number = 228;

/** ---------------------------------------------- */

/** Week Flag 카드 구성 */
/** Week Flag 카드 구성 */

export const weekFlagCardWidth: number = 188;
export const weekFlagCardHeight: number = 228;

/** ---------------------------------------------- */

/** Profile Image 구성 */
/** Profile Image 구성 */

/** Profile Frame 크기 */

export const profileFrameHeight = 720;
export const profileFrameWidth = 515;

/** Profile Image 크기 */

export const profileImageWidth = 440;
export const profileImageHeight = 480;

/** ---------------------------------------------- */
