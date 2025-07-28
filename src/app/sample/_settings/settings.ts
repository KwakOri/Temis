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
