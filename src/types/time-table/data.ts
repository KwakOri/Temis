/** 유저 설정 옵션 */
export type TLanOpt = "kr" | "en" | "jp";

/** 프로젝트 타입 */

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

export interface CardInputConfig {
  fields: SimpleFieldConfig[];
  showLabels?: boolean;
  offlineToggle?: {
    label: string;
    activeColor: string;
    inactiveColor: string;
  };
}

// CARD_INPUT_CONFIG 기반 동적 카드 타입 정의
export interface TDynamicCard {
  isOffline: boolean;
  offlineMemo?: string;
  [key: string]:
    | string
    | number
    | boolean
    | Array<{ text: string; checked: boolean }>
    | undefined;
}

export type TPlaceholders = Record<string, string> & { profileText: string };
