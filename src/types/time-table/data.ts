/** 유저 설정 옵션 */
export type TLanOpt = "kr" | "en" | "jp";

/** 프로젝트 타입 */

export interface SimpleFieldConfig {
  key: string;
  type: "text" | "textarea" | "time" | "date" | "select" | "number";
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

// 개별 엔트리 타입 정의 - 기본 필수 속성과 확장 가능한 속성
export interface TEntry {
  time: string; // 필수: 시간 정보
  mainTitle: string; // 필수: 메인 타이틀
  isGuerrilla: boolean; // 필수: 게릴라방송 여부 (시간이 정확히 정해지지 않은 경우), 기본값 false
  [key: string]: // 확장 가능한 추가 속성들
  | string
    | number
    | boolean
    | Array<{ text: string; checked: boolean }>
    | undefined;
}

export interface TDefaultCard extends TDynamicCard {
  day: number;
}

// CARD_INPUT_CONFIG 기반 동적 카드 타입 정의 (다중 엔트리 지원)
export interface TDynamicCard {
  isOffline: boolean;
  offlineMemo?: string;
  entries: TEntry[];
}

export type TPlaceholders = Record<string, string> & { profileText: string };

export type TAddonPlaceholders = Record<string, string>;
