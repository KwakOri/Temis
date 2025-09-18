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

export type options = "primary" | "secondary" | "tertiary" | "quaternary";

export const fontOption = {
  primary: "Cafe24ClassicType",
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

export const Settings = {
  profile: {
    frame: {
      width: 4000,
      height: 2250,
    },
    image: {
      width: 1440,
      height: 2250,
    },
    artist: {
      width: 725,
      height: 390,
      fontSize: 84,
      fontColor: colors.first.primary,
    },
  },
  card: {
    online: {
      width: 786,
      height: 622,
      time: {
        fontSize: 34,
        fontColor: colors.first.primary,
      },
      day: {
        fontSize: 80,
        fontColor: colors.first.tertiary,
      },
      mainTitle: {
        fontSize: 88,
        fontColor: colors.first.primary,
      },
      subTitle: {
        fontSize: 40,
        fontColor: colors.first.secondary,
      },
    },
    offline: {
      width: 786,
      height: 622,
    },
  },
  week: {
    flag: {
      width: 440,
      height: 1220,
    },
    fontSize: 80,
    fontColor: colors.first.secondary,
  },
};
