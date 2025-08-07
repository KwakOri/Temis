import { CardInputConfig, TLanOpt } from "@/types/time-table/data";
import { TButtonTheme } from "@/types/time-table/theme";

/** ---------------------------------------------- */

/** Fonts 설정 */
/** Fonts 설정 */

/** _styles/index.css 에 먼저 폰트를 등록하고 작성해주세요. */

export const fontOption = {
  primary: "HakgyoansimAllimjangTTF-R",
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

export const colors = {
  first: {
    primary: "#C6AC88",
    secondary: "#3D251C",
    tertiary: "#AD9A89",
    quaternary: "#FFFFFF",
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
      key: "topic",
      type: "text",
      placeholder: "소제목 적는 곳",
      defaultValue: "",
      maxLength: 50,
    },
    {
      key: "description",
      type: "textarea",
      placeholder: "메인타이틀\n적는 곳",
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

export interface ProfileImageStyleProps {
  arrange: "onBottom" | "onTop";
}

export const profileImageStyle: ProfileImageStyleProps = {
  arrange: "onBottom",
};

export const profileTextPlaceholder = "작가 이름";

/** ---------------------------------------------- */

export const Settings = {
  template: {
    width: 4000,
    height: 2250,
  },
  cell: {},
  online: {
    style: {
      width: null,
      height: null,
      top: null,
      right: null,
    },
  },
  offline: {
    style: {
      width: null,
      height: null,
      top: null,
      right: null,
    },
  },
  flag: {
    style: {
      width: null,
      height: null,
      top: null,
      right: null,
    },
  },
  profile: {
    image: {
      style: {
        width: null,
        height: null,
        top: null,
        right: null,
        transform: `rotate(${null}deg)`,
      },
    },
    frame: {
      style: {
        width: null,
        height: null,
        top: null,
        right: null,
      },
    },
    text: {
      wrapper: {
        style: {
          bottom: null,
          right: null,
          width: null,
          height: null,
        },
      },
      content: {
        style: {
          top: null,
          left: null,
          width: null,
          height: null,
          transform: `rotate(${null}deg)`,
        },
      },
      font: {
        maxSize: null,
      },
    },
    backPlate: {
      style: {
        top: null,
        right: null,
        zIndex: "0",
        width: 1327,
        height: 1484,
      },
    },
  },
};
