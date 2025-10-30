import { CardInputConfig, TDynamicCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  createPageAwareStorage,
  getPageId,
} from "@/utils/pageAwareLocalStorage";

// localStorage 키 상수 (페이지별로 고유하게 관리됨)
export const STORAGE_KEYS = {
  THUMBNAIL_DATA: "template-thumbnail-data",
  THEME: "template-thumbnail-theme",
  CONFIG: "template-thumbnail-config", // CardInputConfig 저장용
  VERSION: "template-thumbnail-version", // 데이터 구조 버전
} as const;

// 현재 데이터 구조 버전 (환경변수에서 가져오기)
const getCurrentVersion = (): string => {
  return process.env.NEXT_PUBLIC_DATA_VERSION || "1.0.0";
};

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
export const clearAllThumbnailStorage = (): boolean => {
  const storage = getCurrentPageStorage();
  if (!storage) return false;

  return storage.clearPageData();
};

/**
 * 버전 확인 및 데이터 무효화 처리
 */
const checkVersionAndClearIfNeeded = (): boolean => {
  const storage = getCurrentPageStorage();
  if (!storage) return false;

  const currentVersion = getCurrentVersion();
  const storedVersion = storage.getItem(STORAGE_KEYS.VERSION, null);

  // 버전이 다르거나 존재하지 않는 경우 데이터 초기화
  if (storedVersion !== currentVersion) {
    console.info(
      `Data version mismatch. Stored: ${storedVersion}, Current: ${currentVersion}. Clearing localStorage.`
    );

    // 모든 데이터 삭제
    storage.removeItem(STORAGE_KEYS.THUMBNAIL_DATA);
    storage.removeItem(STORAGE_KEYS.THEME);
    storage.removeItem(STORAGE_KEYS.CONFIG);

    // 새 버전 저장
    storage.setItem(STORAGE_KEYS.VERSION, currentVersion);

    return true; // 데이터가 초기화됨을 의미
  }

  return false; // 버전이 일치함
};

// 썸네일 특화 저장/로드 함수들
export const thumbnailStorage = {
  /**
   * 썸네일 데이터 저장 (TDynamicCard 타입)
   */
  saveData: (data: TDynamicCard): boolean => {
    const success = saveToStorage(STORAGE_KEYS.THUMBNAIL_DATA, data);
    // 데이터 저장 시 현재 버전도 함께 저장
    if (success) {
      saveToStorage(STORAGE_KEYS.VERSION, getCurrentVersion());
    }
    return success;
  },

  /**
   * 썸네일 데이터 로드 (TDynamicCard 타입)
   */
  loadData: (defaultData: TDynamicCard): TDynamicCard => {
    // 버전 확인 후 데이터 로드
    checkVersionAndClearIfNeeded();
    return loadFromStorage(STORAGE_KEYS.THUMBNAIL_DATA, defaultData);
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
    // 버전 확인 후 테마 로드
    checkVersionAndClearIfNeeded();
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
    // 버전 확인 후 설정 로드
    checkVersionAndClearIfNeeded();
    return loadFromStorage(STORAGE_KEYS.CONFIG, defaultConfig);
  },

  /**
   * 모든 썸네일 데이터 한번에 저장 (CardInputConfig 포함)
   */
  saveAll: (payload: {
    data: TDynamicCard;
    theme: TTheme;
    cardInputConfig: CardInputConfig;
  }): boolean => {
    let success = true;

    success = success && thumbnailStorage.saveData(payload.data);
    success = success && thumbnailStorage.saveTheme(payload.theme);
    success = success && thumbnailStorage.saveConfig(payload.cardInputConfig);

    return success;
  },

  /**
   * 모든 썸네일 데이터 한번에 로드 (CardInputConfig 포함)
   */
  loadAll: (defaults: {
    data: TDynamicCard;
    theme: TTheme;
    cardInputConfig: CardInputConfig;
  }) => {
    return {
      data: thumbnailStorage.loadData(defaults.data),
      theme: thumbnailStorage.loadTheme(defaults.theme),
      cardInputConfig: thumbnailStorage.loadConfig(defaults.cardInputConfig),
    };
  },

  /**
   * 데이터 검증 함수 (로드된 데이터가 올바른 형식인지 확인)
   */
  validateData: (data: TDynamicCard) => {
    if (typeof data !== "object" || data === null) return false;
    if (typeof data.isOffline !== "boolean") return false;
    if (!Array.isArray(data.entries)) return false;
    if (data.entries.length === 0) return false; // 최소 하나의 엔트리 보장

    return data.entries.every(
      (entry) => typeof entry === "object" && entry !== null
      // 동적 필드는 CardInputConfig에 따라 달라지므로 기본 검증만 수행
    );
  },

  /**
   * 안전한 데이터 로드 (검증 포함)
   */
  loadDataSafely: (defaultData: TDynamicCard): TDynamicCard => {
    const data = thumbnailStorage.loadData(defaultData);

    if (thumbnailStorage.validateData(data)) {
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
