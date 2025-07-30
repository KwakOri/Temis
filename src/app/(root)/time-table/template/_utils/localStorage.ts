import { TDefaultCard } from "../_settings/general";
import { TTheme } from "../_settings/settings";

// localStorage 키 상수
export const STORAGE_KEYS = {
  TIMETABLE_DATA: "template-timetable-data",
  PROFILE_IMAGE: "template-timetable-profile-image",
  THEME: "template-timetable-theme",
  SCALE: "template-timetable-scale",
} as const;

// 브라우저 환경 체크
const isClient = typeof window !== "undefined";

/**
 * localStorage에 데이터를 안전하게 저장하는 함수
 */
export const saveToStorage = <T>(key: string, data: T): boolean => {
  if (!isClient) return false;
  
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.warn(`Failed to save to localStorage (key: ${key}):`, error);
    return false;
  }
};

/**
 * localStorage에서 데이터를 안전하게 불러오는 함수
 */
export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (!isClient) return defaultValue;
  
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) return defaultValue;
    
    return JSON.parse(serializedData) as T;
  } catch (error) {
    console.warn(`Failed to load from localStorage (key: ${key}):`, error);
    return defaultValue;
  }
};

/**
 * localStorage에서 특정 키의 데이터를 삭제하는 함수
 */
export const removeFromStorage = (key: string): boolean => {
  if (!isClient) return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove from localStorage (key: ${key}):`, error);
    return false;
  }
};

/**
 * localStorage를 완전히 초기화하는 함수
 */
export const clearAllTimeTableStorage = (): boolean => {
  if (!isClient) return false;
  
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.warn("Failed to clear timetable storage:", error);
    return false;
  }
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
   * 프로필 이미지 저장 (Base64 문자열)
   */
  saveProfileImage: (imageData: string): boolean => {
    return saveToStorage(STORAGE_KEYS.PROFILE_IMAGE, imageData);
  },

  /**
   * 프로필 이미지 로드
   */
  loadProfileImage: (defaultImage: string = ""): string => {
    return loadFromStorage(STORAGE_KEYS.PROFILE_IMAGE, defaultImage);
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
   * 스케일 저장
   */
  saveScale: (scale: number): boolean => {
    return saveToStorage(STORAGE_KEYS.SCALE, scale);
  },

  /**
   * 스케일 로드
   */
  loadScale: (defaultScale: number = 1): number => {
    return loadFromStorage(STORAGE_KEYS.SCALE, defaultScale);
  },

  /**
   * 모든 타임테이블 데이터 한번에 저장
   */
  saveAll: (payload: {
    data: TDefaultCard[];
    profileImage?: string;
    theme?: TTheme;
    scale?: number;
  }): boolean => {
    let success = true;
    
    success = success && timeTableStorage.saveData(payload.data);
    
    if (payload.profileImage !== undefined) {
      success = success && timeTableStorage.saveProfileImage(payload.profileImage);
    }
    
    if (payload.theme !== undefined) {
      success = success && timeTableStorage.saveTheme(payload.theme);
    }
    
    if (payload.scale !== undefined) {
      success = success && timeTableStorage.saveScale(payload.scale);
    }
    
    return success;
  },

  /**
   * 모든 타임테이블 데이터 한번에 로드
   */
  loadAll: (defaults: {
    data: TDefaultCard[];
    profileImage?: string;
    theme?: TTheme;
    scale?: number;
  }) => {
    return {
      data: timeTableStorage.loadData(defaults.data),
      profileImage: timeTableStorage.loadProfileImage(defaults.profileImage),
      theme: timeTableStorage.loadTheme(defaults.theme || "main"),
      scale: timeTableStorage.loadScale(defaults.scale || 1),
    };
  },

  /**
   * 개별 카드 데이터 업데이트 (특정 요일의 카드만 업데이트)
   */
  updateCardData: (dayIndex: number, cardData: Partial<TDefaultCard>, currentData: TDefaultCard[]): boolean => {
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
  updateFieldForAllCards: (fieldKey: keyof TDefaultCard, value: any, currentData: TDefaultCard[]): boolean => {
    const newData = currentData.map(card => ({
      ...card,
      [fieldKey]: value
    }));
    return timeTableStorage.saveData(newData);
  },

  /**
   * 데이터 검증 함수 (로드된 데이터가 올바른 형식인지 확인)
   */
  validateData: (data: any): data is TDefaultCard[] => {
    if (!Array.isArray(data)) return false;
    if (data.length !== 7) return false; // 7일간의 데이터여야 함
    
    return data.every((card, index) => {
      return (
        typeof card === 'object' &&
        card !== null &&
        typeof card.day === 'number' &&
        card.day === index &&
        typeof card.isOffline === 'boolean' &&
        typeof card.time === 'string' &&
        typeof card.topic === 'string' &&
        typeof card.description === 'string'
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
    } else {
      console.warn("Loaded data is invalid, using default data");
      return defaultData;
    }
  }
};

/**
 * 자동 저장 기능을 위한 디바운스 함수
 */
export const createAutoSave = (saveFunction: () => void, delay: number = 1000) => {
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

/**
 * 실시간 저장을 위한 React Hook 사용 예제 (주석으로 제공)
 * 
 * // TimeTableEditor 컴포넌트에서 사용 예제:
 * 
 * const [data, setData] = useState<TDefaultCard[]>(() => {
 *   return timeTableStorage.loadDataSafely(defaultCards);
 * });
 * 
 * const [profileText, setProfileText] = useState(() => {
 *   return timeTableStorage.loadProfileText();
 * });
 * 
 * // 자동 저장 설정 (1초 디바운스)
 * const autoSave = useMemo(() => 
 *   createAutoSave(() => {
 *     timeTableStorage.saveAll({
 *       data,
 *       profileText,
 *       theme: currentTheme,
 *       scale: currentScale
 *     });
 *   }, 1000), [data, profileText, currentTheme, currentScale]
 * );
 * 
 * // 데이터 변경 시 자동 저장 트리거
 * useEffect(() => {
 *   autoSave();
 * }, [data, profileText, autoSave]);
 * 
 */