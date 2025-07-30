/** 유저 설정 옵션 */
export type TLanOpt = "kr" | "en" | "jp";

/** 프로젝트 타입 */
export interface Data {
  day: number;
  isOffline: boolean;
  time: string;
  topic: string;
  description: string;
}

export type TTheme = "blue" | "yellow" | "pink";

export type TInitialCard = {
  isOffline: boolean;
  time: string;
  topic: string;
  description: string;
};

export interface TDefaultCard extends TInitialCard {
  day: number;
}

export interface TExtendedCard extends TDefaultCard {
  [key: string]:
    | string
    | number
    | boolean
    | Array<{ text: string; checked: boolean }>
    | undefined;
}

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
