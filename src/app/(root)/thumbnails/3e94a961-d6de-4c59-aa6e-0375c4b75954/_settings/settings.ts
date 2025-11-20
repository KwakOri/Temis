import { CardInputConfig, TLanOpt } from "@/types/time-table/data";
import { TButtonTheme } from "@/types/time-table/theme";

/** ---------------------------------------------- */

export const templateSize = {
  width: 1280,
  height: 720,
};

/** Fonts 설정 */
/** Fonts 설정 */

/** _styles/index.css 에 먼저 폰트를 등록하고 작성해주세요. */

export const fontOption = {
  primary: "SchoolSafetyNotification",
  secondary: "Cafe24ShiningStar",
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

/**
 * 날자: #FFFFFF , #FEFDAB
 * 메인 제목: #1A1A1A
 * 소 제목: #B0B0B0
 * 시간: #FEFDAB
 */

export const colors = {
  first: {
    primary: "#E1FAFF",
    secondary: "#FFFFFF",
    tertiary: "",
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

export const onlineCardWidth: number = 860;
export const onlineCardHeight: number = 817;

// 개발자 전용: 카드 입력 필드 구성
// 이 부분만 수정하면 카드의 입력 필드가 변경됩니다

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환하는 헬퍼 함수
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: "date",
      type: "date",
      placeholder: "",
      required: true,
      defaultValue: getTodayDate(),
    },
    {
      key: "category",
      type: "select",
      placeholder: "카테고리 선택",
      defaultValue: "없음",
      required: true,
      options: [
        { value: "none", label: "없음" },
        { value: "3DIO", label: "3DIO" },
        { value: "YETI", label: "YETI" },
      ],
    },
    {
      key: "mainTitleX",
      type: "number",
      label: "가로 위치",
      placeholder: "가로 위치 조정",
      defaultValue: "0",
    },
    {
      key: "mainTitleY",
      label: "세로 위치",
      type: "number",
      placeholder: "세로 위치 조정",
      defaultValue: "0",
    },
    {
      key: "mainTitle",
      type: "textarea",
      placeholder: "메인 타이틀\n적는 곳",
      defaultValue: "",
      maxLength: 200,
    },
    {
      key: "tags",
      type: "text",
      placeholder: "＃태그 # 적는 곳",
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

export const offlineCardWidth: number = 860;
export const offlineCardHeight: number = 817;

/** ---------------------------------------------- */

/** Week Flag 카드 구성 */
/** Week Flag 카드 구성 */

export const weekFlagCardWidth: number = 766;
export const weekFlagCardHeight: number = 778;

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

export const profileImageWidth = 1280;
export const profileImageHeight = 720;

export const profileBackPlateWidth = 1327;
export const profileBackPlateHeight = 1484;

export const profileTextPlaceholder = "아티스트 명 적는곳";

/** ---------------------------------------------- */
