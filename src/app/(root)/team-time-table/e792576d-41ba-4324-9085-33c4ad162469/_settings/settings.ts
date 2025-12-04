import { CardInputConfig, TLanOpt } from "@/types/time-table/data";
import { TButtonTheme } from "@/types/time-table/theme";
import { CSSProperties } from "react";

/** ---------------------------------------------- */

export const templateSize = {
  width: 4000,
  height: 2250,
};

/** Fonts 설정 */
/** Fonts 설정 */

/** _styles/index.css 에 먼저 폰트를 등록하고 작성해주세요. */

export type options = "primary" | "secondary" | "tertiary" | "quaternary";

export const fontOption = {
  primary: "SchoolSafetyNotification",
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

/**
 * 날자: #FFFFFF , #FEFDAB
 * 메인 제목: #1A1A1A
 * 소 제목: #B0B0B0
 * 시간: #FEFDAB
 */

export const colors = {
  first: {
    primary: "#DCEAFF",
    secondary: "#D7BF8D",
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

export const TEAM_MEMBER_IDS = [1, 2, 3, 4];

// 개발자 전용: 카드 입력 필드 구성
// 이 부분만 수정하면 카드의 입력 필드가 변경됩니다
export const CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: "time",
      type: "time",
      placeholder: "10:00",
      required: true,
      defaultValue: "10:00",
    },
    {
      key: "mainTitle",
      type: "textarea",
      placeholder: "메인 타이틀\n적는 곳",
      defaultValue: "",
      maxLength: 200,
    },
    {
      key: "subTitle",
      type: "text",
      placeholder: "소제목 적는 곳",
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

/** Profile Image 크기 */

export const profileTextPlaceholder = "아티스트 명";

/** ---------------------------------------------- */
type SettingsType = {
  canvas_size: CSSProperties;
  profile_frame: CSSProperties;
  profile_image: CSSProperties;
  card_online: CSSProperties;
  card_offline: CSSProperties;
  week_flag: CSSProperties;
};

export const Settings: SettingsType = {
  canvas_size: {
    width: 4000,
    height: 2250,
  },

  profile_frame: {
    width: 400,
    height: 300,
  },
  profile_image: {
    width: 982,
    height: 405,
  },
  card_online: {
    width: 370,
    height: 370,
  },
  card_offline: {
    width: 370,
    height: 370,
  },
  week_flag: {
    width: 440,
    height: 1220,
    fontSize: 80,
    color: colors.first.secondary,
    fontFamily: fontOption.primary,
  },
};

export const team_ids = [75, 74, 77, 62];

export interface Palette {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

export type MemberColorPallettes = Record<number, Palette>;

export const member_colors: MemberColorPallettes = {
  75: {
    primary: "#E38431",
    secondary: "#E38431",
    tertiary: "",
    quaternary: "",
  },
  74: {
    primary: "#3D94B5",
    secondary: "#3D94B5",
    tertiary: "",
    quaternary: "",
  },
  77: {
    primary: "#1E2629",
    secondary: "#EDF8F7",
    tertiary: "",
    quaternary: "",
  },
  62: {
    primary: "#F4B224",
    secondary: "#F4B224",
    tertiary: "",
    quaternary: "",
  },
};
