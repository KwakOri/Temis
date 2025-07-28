import { TDefaultCard } from "../_settings/general";
import { TTheme } from "../_settings/settings";

// localStorage 키 상수
const STORAGE_KEYS = {
  TIMETABLE_DATA: "timetable-data",
  TIMETABLE_THEME: "timetable-theme",
  PROFILE_TEXT: "timetable-profile-text",
} as const;

/**
 * 시간표 데이터를 localStorage에 저장
 */
export const saveTimeTableData = (data: TDefaultCard[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE_DATA, JSON.stringify(data));
  } catch (error) {
    console.error("시간표 데이터 저장 실패:", error);
  }
};

/**
 * localStorage에서 시간표 데이터 로드
 */
export const loadTimeTableData = (): TDefaultCard[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("시간표 데이터 로드 실패:", error);
    return null;
  }
};

/**
 * 테마를 localStorage에 저장
 */
export const saveTheme = (theme: TTheme): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE_THEME, theme);
  } catch (error) {
    console.error("테마 저장 실패:", error);
  }
};

/**
 * localStorage에서 테마 로드
 */
export const loadTheme = (): TTheme | null => {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.TIMETABLE_THEME);
    return theme && ["blue", "yellow", "pink"].includes(theme)
      ? (theme as TTheme)
      : null;
  } catch (error) {
    console.error("테마 로드 실패:", error);
    return null;
  }
};

/**
 * 작가명을 localStorage에 저장
 */
export const saveProfileText = (profileText: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE_TEXT, profileText);
  } catch (error) {
    console.error("작가명 저장 실패:", error);
  }
};

/**
 * localStorage에서 작가명 로드
 */
export const loadProfileText = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.PROFILE_TEXT);
  } catch (error) {
    console.error("작가명 로드 실패:", error);
    return null;
  }
};

/**
 * 모든 시간표 관련 데이터를 localStorage에서 삭제
 */
export const clearAllTimeTableData = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      if (key !== STORAGE_KEYS.TIMETABLE_THEME) localStorage.removeItem(key);
    });
  } catch (error) {
    console.error("시간표 데이터 삭제 실패:", error);
  }
};
