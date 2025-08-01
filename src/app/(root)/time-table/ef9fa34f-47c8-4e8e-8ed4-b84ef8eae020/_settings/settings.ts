import { TLanOpt } from "../_types/types";
import { CardInputConfig, TButtonTheme } from "./general";

/** ---------------------------------------------- */

/** Fonts 설정 */
/** Fonts 설정 */

/** _styles/index.css 에 먼저 폰트를 등록하고 작성해주세요. */

export const fontOption = {
  primary: "Danjo-bold-Regular",
  secondary: "",
  tertiary: "",
  quaternary: "",
};

/** ---------------------------------------------- */

/** 요일 표시 설정 */
/** 요일 표시 설정 */

/** kr | en | jp */

export const weekdayOption: TLanOpt = "kr";
export const monthOption: TLanOpt = "en";

/** ---------------------------------------------- */

/** Theme 설정 */
/** Theme 설정 */

export const Themes = ["first", "second", "third"] as const;

export const defaultTheme = "first" as const;

export const buttonThemes: TButtonTheme[] = [
  { value: "first", label: "first" },
];

export const colors = {
  first: {
    primary: "#FFFFFF",
    secondary: "#372F47",
    tertiary: "#706095",
    quaternary: "",
  },
  second: {
    primary: "",
    secondary: "",
    tertiary: "",
    quaternary: "",
  },
  third: {
    primary: "",
    secondary: "",
    tertiary: "",
    quaternary: "",
  },
};

/** ---------------------------------------------- */

/** Online 카드 구성 */
/** Online 카드 구성 */

export const onlineCardWidth: number = 249;
export const onlineCardHeight: number = 185;

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
      placeholder: "소제목 적는곳",
      defaultValue: "",
      maxLength: 50,
    },
    {
      key: "description",
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

// CARD_INPUT_CONFIG에서 동적으로 생성된 placeholders와 추가 필드들을 병합

/** ---------------------------------------------- */

/** Offline 카드 구성 */
/** Offline 카드 구성 */

export const offlineCardWidth: number = 249;
export const offlineCardHeight: number = 185;

/** ---------------------------------------------- */

/** Week Flag 카드 구성 */
/** Week Flag 카드 구성 */

export const weekFlagCardWidth: number = 244;
export const weekFlagCardHeight: number = 387;

/** ---------------------------------------------- */

/** Profile Image 구성 */
/** Profile Image 구성 */

/** Profile Frame 크기 */

export interface ProfileImageInfoInterface {
  arrange: "onBottom" | "onTop";
  rotation: number;
  position: {
    top: number;
    right: number;
  };
}

export const profileImageInfo: ProfileImageInfoInterface = {
  arrange: "onBottom",
  rotation: 4,
  position: {
    top: 8,
    right: 24,
  },
};

export const profileTextInfo = {
  size: {
    width: 220,
    height: 60,
  },
  position: {
    bottom: 68,
    right: 44,
  },
  font: {
    maxSize: 28,
    minSize: 20,
  },
};

export const profileTextPlaceholder = "작가명 적는 곳";

export const profileFrameWidth = 455;
export const profileFrameHeight = 743;

/** Profile Image 크기 */

export const profileImageWidth = 538;
export const profileImageHeight = 720;

/** ---------------------------------------------- */
