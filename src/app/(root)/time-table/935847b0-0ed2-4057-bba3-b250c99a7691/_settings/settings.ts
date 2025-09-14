import { CardInputConfig, TLanOpt } from "@/types/time-table/data";
import { TButtonTheme } from "@/types/time-table/theme";

/** ---------------------------------------------- */

export const templateSize = {
  width: 4000,
  height: 2250,
};

/** Fonts 설정 */
/** Fonts 설정 */

/** _styles/index.css 에 먼저 폰트를 등록하고 작성해주세요. */

export const fontOption = {
  primary: "Pretendard",
  secondary: "",
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

export const Themes = ["first", "second", "third"] as const;

export const defaultTheme = "first" as const;

export const buttonThemes: TButtonTheme[] = [
  { value: "first", label: "first" },
];

/**
 * 날자: #FFFFFF , #FEFDAB
 * 메인 제목: #1A1A1A
 * 소 제목: #B0B0B0
 * 시간: #FEFDAB
 */

export const colors = {
  first: {
    primary: "#FE5D7B",
    secondary: "#DAC39D",
    tertiary: "#FFFFFF",
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

export const onlineCardWidth: number = 799;
export const onlineCardHeight: number = 891;

// 개발자 전용: 카드 입력 필드 구성
// 이 부분만 수정하면 카드의 입력 필드가 변경됩니다
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
    {
      key: "subTopic",
      type: "text",
      placeholder: "얀즈데이",
      defaultValue: "",
      maxLength: 50,
    },
    {
      key: "subDescription",
      type: "text",
      placeholder: "짧방",
      defaultValue: "",
      maxLength: 50,
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

export const offlineCardWidth: number = 799;
export const offlineCardHeight: number = 891;

/** ---------------------------------------------- */

/** Week Flag 카드 구성 */
/** Week Flag 카드 구성 */

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
    top: -1,
    right: -10,
  },
};

export const profileTextInfo = {
  size: {
    width: 220,
    height: 60,
  },
  position: {
    bottom: 70,
    right: 44,
  },
  font: {
    maxSize: 32,
    minSize: 16,
  },
};

export const profileFrameWidth = 4000;
export const profileFrameHeight = 2250;

/** Profile Image 크기 */

export const profileImageWidth = 1400;
export const profileImageHeight = 1320;

export const profileBackPlateWidth = 1327;
export const profileBackPlateHeight = 1484;

export const profileTextPlaceholder = "아티스트 명";

/** ---------------------------------------------- */
