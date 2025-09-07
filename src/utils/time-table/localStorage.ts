import { CardInputConfig } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  createPageAwareStorage,
  getPageId,
} from "@/utils/pageAwareLocalStorage";
import { TDefaultCard } from "@/utils/time-table/data";

// localStorage 키 상수 (페이지별로 고유하게 관리됨)
export const STORAGE_KEYS = {
  TIMETABLE_DATA: "template-timetable-data",
  THEME: "template-timetable-theme",
  CONFIG: "template-timetable-config", // CardInputConfig 저장용
} as const;

// 브라우저 환경 체크
const isClient = typeof window !== "undefined";

// 현재 페이지의 storage 인스턴스 생성
const getCurrentPageStorage = () => {
  if (!isClient) return null;
  return createPageAwareStorage(getPageId());
};

/**
 * 페이지별 localStorage에 데이터를 안전하게 저장하는 함수
 */
export const saveToStorage = <T>(key: string, data: T): boolean => {
  const storage = getCurrentPageStorage();
  if (!storage) return false;

  return storage.setItem(key, data);
};

/**
 * 페이지별 localStorage에서 데이터를 안전하게 불러오는 함수
 */
export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  const storage = getCurrentPageStorage();
  if (!storage) return defaultValue;

  return storage.getItem(key, defaultValue);
};

/**
 * 페이지별 localStorage에서 특정 키의 데이터를 삭제하는 함수
 */
export const removeFromStorage = (key: string): boolean => {
  const storage = getCurrentPageStorage();
  if (!storage) return false;

  return storage.removeItem(key);
};

/**
 * 현재 페이지의 localStorage를 완전히 초기화하는 함수
 */
export const clearAllTimeTableStorage = (): boolean => {
  const storage = getCurrentPageStorage();
  if (!storage) return false;

  return storage.clearPageData();
};

// 타임테이블 특화 저장/로드 함수들
export const timeTableStorage = {
  /**
   * 타임테이블 데이터 저장 (TDefaultCard[] 타입)
   */
  saveData: (data: TDefaultCard[]): boolean => {
    return saveToStorage(STORAGE_KEYS.TIMETABLE_DATA, data);
  },

  /**
   * 타임테이블 데이터 로드 (TDefaultCard[] 타입)
   */
  loadData: (defaultData: TDefaultCard[]): TDefaultCard[] => {
    return loadFromStorage(STORAGE_KEYS.TIMETABLE_DATA, defaultData);
  },

  /**
   * 테마 저장 (TTheme 타입)
   */
  saveTheme: (theme: TTheme): boolean => {
    return saveToStorage(STORAGE_KEYS.THEME, theme);
  },

  /**
   * 테마 로드 (TTheme 타입)
   */
  loadTheme: (defaultTheme: TTheme): TTheme => {
    return loadFromStorage(STORAGE_KEYS.THEME, defaultTheme);
  },

  /**
   * CardInputConfig 저장
   */
  saveConfig: (config: CardInputConfig): boolean => {
    return saveToStorage(STORAGE_KEYS.CONFIG, config);
  },

  /**
   * CardInputConfig 로드
   */
  loadConfig: (defaultConfig: CardInputConfig): CardInputConfig => {
    return loadFromStorage(STORAGE_KEYS.CONFIG, defaultConfig);
  },

  /**
   * 모든 타임테이블 데이터 한번에 저장 (CardInputConfig 포함)
   */
  saveAll: (payload: {
    data: TDefaultCard[];
    theme: TTheme;
    cardInputConfig: CardInputConfig;
  }): boolean => {
    let success = true;

    success = success && timeTableStorage.saveData(payload.data);
    success = success && timeTableStorage.saveTheme(payload.theme);
    success = success && timeTableStorage.saveConfig(payload.cardInputConfig);

    return success;
  },

  /**
   * 모든 타임테이블 데이터 한번에 로드 (CardInputConfig 포함)
   */
  loadAll: (defaults: {
    data: TDefaultCard[];
    theme: TTheme;
    cardInputConfig: CardInputConfig;
  }) => {
    return {
      data: timeTableStorage.loadData(defaults.data),
      theme: timeTableStorage.loadTheme(defaults.theme),
      cardInputConfig: timeTableStorage.loadConfig(defaults.cardInputConfig),
    };
  },

  /**
   * 개별 카드 데이터 업데이트 (특정 요일의 카드만 업데이트)
   */
  updateCardData: (
    dayIndex: number,
    cardData: Partial<TDefaultCard>,
    currentData: TDefaultCard[]
  ): boolean => {
    const newData = [...currentData];
    if (dayIndex >= 0 && dayIndex < newData.length) {
      newData[dayIndex] = { ...newData[dayIndex], ...cardData };
      return timeTableStorage.saveData(newData);
    }
    return false;
  },

  /**
   * 특정 필드만 업데이트 (모든 카드의 특정 필드를 한번에 업데이트)
   */
  updateFieldForAllCards: (
    fieldKey: keyof TDefaultCard,
    value: TDefaultCard[keyof TDefaultCard],
    currentData: TDefaultCard[]
  ): boolean => {
    const newData = currentData.map((card) => ({
      ...card,
      [fieldKey]: value,
    }));
    return timeTableStorage.saveData(newData);
  },

  /**
   * 데이터 검증 함수 (로드된 데이터가 올바른 형식인지 확인)
   */
  validateData: (data: TDefaultCard[]) => {
    if (!Array.isArray(data)) return false;
    if (data.length !== 7) return false; // 7일간의 데이터여야 함

    return data.every((card, index) => {
      return (
        typeof card === "object" &&
        card !== null &&
        typeof card.day === "number" &&
        card.day === index &&
        typeof card.isOffline === "boolean" &&
        Array.isArray(card.entries) && // entries 배열 검증
        card.entries.length > 0 && // 최소 하나의 엔트리 보장
        card.entries.every(
          (entry) => typeof entry === "object" && entry !== null
        )
        // 동적 필드는 CardInputConfig에 따라 달라지므로 기본 검증만 수행
      );
    });
  },

  /**
   * 안전한 데이터 로드 (검증 포함)
   */
  loadDataSafely: (defaultData: TDefaultCard[]): TDefaultCard[] => {
    const data = timeTableStorage.loadData(defaultData);

    if (timeTableStorage.validateData(data)) {
      return data;
    }

    console.warn("Loaded data is invalid, using default data");
    return defaultData;
  },
};

/**
 * 자동 저장 기능을 위한 디바운스 함수
 */
export const createAutoSave = (
  saveFunction: () => void,
  delay: number = 1000
) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      saveFunction();
      timeoutId = null;
    }, delay);
  };
};
