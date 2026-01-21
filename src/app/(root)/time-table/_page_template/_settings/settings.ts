import { CardInputConfig, TLanOpt } from "@/types/time-table/data";
import { TButtonTheme } from "@/types/time-table/theme";


export interface CardSizesProps {
  ONLINE: {
    width: number;
    height: number;
  },
  OFFLINE: {
    width: number;
    height: number;
  },
  PROFILE: {
    width: number;
    height: number;
  },
  FRAME: {
    width: number;
    height: number;
  }
}
/** ---------------------------------------------- */

export const templateSize = {
  width: 4000,
  height: 2250,
};

/** Fonts 설정 */
/** Fonts 설정 */

/** _styles/index.css 에 먼저 폰트를 등록하고 작성해주세요. */

export const BASE_FONTS = {
  PRIMARY: "KerisKedyuche",
  SECONDARY: "",
  TERTIARY: "",
  QUATERNARY: "",
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

export const BASE_COLORS = {
  first: {
    primary: "#282840",
    secondary: "#FFFFFF",
    tertiary: "#349EEB",
    quaternary: "#6DB4EB",
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

export const COMP_COLORS = {
  MAIN_TITLE : BASE_COLORS["first"]["primary"],
  SUB_TITLE : BASE_COLORS["first"]["primary"],
  STREAMING_TIME : BASE_COLORS["first"]["primary"],
  STREAMING_DATE : BASE_COLORS["first"]["primary"],
  STREAMING_DAY : BASE_COLORS["first"]["primary"],
  ARTIST: BASE_COLORS["first"]["primary"],
}

export const COMP_FONTS = {
  MAIN_TITLE : BASE_FONTS.PRIMARY,
  SUB_TITLE : BASE_FONTS.PRIMARY,
  STREAMING_TIME : BASE_FONTS.PRIMARY,
  STREAMING_DATE : BASE_FONTS.PRIMARY,
  STREAMING_DAY : BASE_FONTS.PRIMARY,
  ARTIST: BASE_FONTS.PRIMARY,
  WEEKLY_FLAG:BASE_FONTS.PRIMARY,
}

export const MAX_FONT_SIZES = {
  MAIN_TITLE: 10,
  SUB_TITLE: 10,
  ARTIST: 10
}



export const CARD_SIZES:CardSizesProps = {
  ONLINE: {
    width: 10,
    height: 10,
  },
  OFFLINE: {
    width: 10,
    height: 10,
  },
  PROFILE: {
    width: 10,
    height: 10,
  },
  FRAME: {
    width: 4000,
    height: 2250
  }
}

export const profileTextPlaceholder = "아티스트 명";
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
      placeholder: "서브 타이틀 적는 곳",
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