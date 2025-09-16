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

/** primary (메인제목, 시간, 요일) */
/** secondary (합방 멤버, 아티스트) */

export const fontOption = {
  primary: "establishRetrosansOTF",
  secondary: "HakgyoansimAllimjangTTF-R",
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
    primary: "#031A51",
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
      placeholder: "메인타이틀\n적는 곳",
      defaultValue: "",
      maxLength: 200,
    },
    {
      key: "with",
      type: "textarea",
      placeholder: "합방 명단",
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

/** Online 카드 구성 */
/** Online 카드 구성 */

export const onlineCardWidth: number = 728;
export const onlineCardHeight: number = 644;

export const WithCardWidth: number = 714;
export const WithCardHeight: number = 627;

/** Offline 카드 구성 */
/** Offline 카드 구성 */

export const offlineCardWidth: number = 728;
export const offlineCardHeight: number = 657;

/** ---------------------------------------------- */

/** Week Flag 카드 구성 */
/** Week Flag 카드 구성 */

export const weekFlagCardWidth: number = 1080;
export const weekFlagCardHeight: number = 100;

/** ---------------------------------------------- */

/** Profile Image 구성 */
/** Profile Image 구성 */

/** Profile Frame 크기 */
/** Profile Frame 크기 */

export interface ProfileImageStyleProps {
  arrange: "onBottom" | "onTop";
  rotation: number;
  position: {
    top: number;
    right: number;
  };
}

export const profileImageStyle: ProfileImageStyleProps = {
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
  },
};

/** Profile Image 크기 */

export const profileImageWidth = 1510;
export const profileImageHeight = 2100;

export const profileTextPlaceholder = "작가 이름";

/** ---------------------------------------------- */
