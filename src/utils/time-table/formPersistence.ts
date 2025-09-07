import { CardInputConfig } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { TDefaultCard, getDefaultCards } from "@/utils/time-table/data";
import { useCallback, useEffect, useMemo } from "react";
import {
  clearAllTimeTableStorage,
  createAutoSave,
  timeTableStorage,
} from "./localStorage";

/**
 * 폼 데이터 지속성을 위한 커스텀 훅
 * CardInputConfig를 받아서 동적으로 기본값을 생성합니다.
 */
export const useFormPersistence = (
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme
) => {
  /**
   * 컴포넌트 마운트 시 저장된 데이터 로드
   * CardInputConfig도 함께 반환하여 호환성 검증에 사용
   */
  const loadPersistedData = useCallback(() => {
    const defaultCards = getDefaultCards({ cardInputConfig });
    const loadedData = timeTableStorage.loadAll({
      data: defaultCards,
      theme: defaultTheme,
      cardInputConfig: cardInputConfig,
    });
    
    // 데이터 안전 로드 적용
    const validatedData = timeTableStorage.loadDataSafely(loadedData.data);
    
    return {
      ...loadedData,
      data: validatedData
    };
  }, [cardInputConfig, defaultTheme]);

  /**
   * 데이터 저장 함수
   */
  const saveData = useCallback((data: TDefaultCard[]) => {
    return timeTableStorage.saveData(data);
  }, []);

  const saveTheme = useCallback((theme: TTheme) => {
    return timeTableStorage.saveTheme(theme);
  }, []);

  /**
   * 모든 데이터 한번에 저장 (CardInputConfig 포함)
   */
  const saveAll = useCallback(
    (payload: { data: TDefaultCard[]; theme: TTheme }) => {
      return timeTableStorage.saveAll({
        ...payload,
        cardInputConfig: cardInputConfig,
      });
    },
    [cardInputConfig]
  );

  /**
   * 개별 카드 업데이트
   */
  const updateCard = useCallback(
    (
      dayIndex: number,
      cardData: Partial<TDefaultCard>,
      currentData: TDefaultCard[]
    ) => {
      return timeTableStorage.updateCardData(dayIndex, cardData, currentData);
    },
    []
  );

  /**
   * 데이터 초기화
   */
  const clearAllData = useCallback(() => {
    return clearAllTimeTableStorage();
  }, []);

  return {
    // 로드 함수
    loadPersistedData,

    // 개별 저장 함수들
    saveData,
    saveTheme,

    // 일괄 저장
    saveAll,

    // 개별 업데이트
    updateCard,

    // 초기화
    clearAllData,
  };
};

/**
 * 자동 저장 기능을 포함한 훅
 * CardInputConfig와 defaultTheme을 받아서 useFormPersistence를 사용합니다.
 */
export const useAutoSavePersistence = (
  data: TDefaultCard[],
  theme: TTheme,
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme,
  autoSaveDelay: number = 1000
) => {
  const { saveAll } = useFormPersistence(cardInputConfig, defaultTheme);

  // 자동 저장 함수 생성 (디바운스 적용)
  const autoSave = useMemo(
    () =>
      createAutoSave(() => {
        saveAll({
          data,
          theme,
        });
      }, autoSaveDelay),
    [saveAll, data, theme, autoSaveDelay]
  );

  // 데이터 변경 시 자동 저장 트리거
  useEffect(() => {
    autoSave();
  }, [data, theme, autoSave]);

  return autoSave;
};

/**
 * 브라우저 종료/새로고침 시 데이터 저장을 위한 훅
 * CardInputConfig와 defaultTheme을 받아서 useFormPersistence를 사용합니다.
 */
export const useBeforeUnloadSave = (
  data: TDefaultCard[], 
  theme: TTheme,
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme
) => {
  const { saveAll } = useFormPersistence(cardInputConfig, defaultTheme);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // 브라우저 종료/새로고침 전에 데이터 저장
      saveAll({
        data,
        theme,
      });

      // 사용자에게 확인 메시지 표시 (선택사항)
      event.preventDefault();
      event.returnValue = "";
    };

    const handleVisibilityChange = () => {
      // 탭이 숨겨질 때 데이터 저장
      if (document.visibilityState === "hidden") {
        saveAll({
          data,
          theme,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [data, theme, saveAll]);
};

/**
 * 실시간 개별 필드 저장을 위한 유틸리티 함수들
 * 공용 함수이므로 timeTableStorage를 직접 사용합니다.
 */
export const fieldSavers = {
  /**
   * 특정 카드의 특정 필드 저장
   */
  saveCardField: (
    dayIndex: number,
    fieldKey: keyof TDefaultCard,
    value: string | number | boolean,
    currentData: TDefaultCard[]
  ) => {
    const updatedCard = { [fieldKey]: value };
    return timeTableStorage.updateCardData(dayIndex, updatedCard, currentData);
  },

  /**
   * 오프라인 토글 저장
   */
  saveOfflineToggle: (
    dayIndex: number,
    isOffline: boolean,
    currentData: TDefaultCard[]
  ) => {
    return fieldSavers.saveCardField(
      dayIndex,
      "isOffline",
      isOffline,
      currentData
    );
  },

  /**
   * 동적 필드 저장 (CardInputConfig에 정의된 필드들)
   */
  saveDynamicField: (
    dayIndex: number,
    fieldKey: string,
    value: string | number | boolean,
    currentData: TDefaultCard[]
  ) => {
    return fieldSavers.saveCardField(
      dayIndex,
      fieldKey as keyof TDefaultCard,
      value,
      currentData
    );
  },
};

/**
 * 오류 복구를 위한 백업 시스템
 */
export const backupSystem = {
  /**
   * 현재 데이터를 백업으로 저장
   */
  createBackup: (data: TDefaultCard[], theme: TTheme, scale: number) => {
    const backup = {
      data,
      theme,
      scale,
      timestamp: new Date().toISOString(),
    };

    return localStorage.setItem(
      "template-timetable-backup",
      JSON.stringify(backup)
    );
  },

  /**
   * 백업에서 데이터 복원
   */
  restoreFromBackup: () => {
    try {
      const backupData = localStorage.getItem("template-timetable-backup");
      if (backupData) {
        return JSON.parse(backupData);
      }
    } catch (error) {
      console.error("Failed to restore backup:", error);
    }
    return null;
  },

  /**
   * 백업 삭제
   */
  clearBackup: () => {
    localStorage.removeItem("template-timetable-backup");
  },
};