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
