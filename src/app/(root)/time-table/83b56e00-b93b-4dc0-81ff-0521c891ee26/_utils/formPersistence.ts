import { useCallback, useEffect, useMemo } from "react";
import { TDefaultCard, defaultCards } from "../_settings/general";
import { TTheme } from "../_settings/general";
import { defaultTheme } from "../_settings/settings";
import {
  clearAllTimeTableStorage,
  createAutoSave,
  timeTableStorage,
} from "./localStorage";

/**
 * 폼 데이터 지속성을 위한 커스텀 훅
 */
export const useFormPersistence = () => {
  /**
   * 컴포넌트 마운트 시 저장된 데이터 로드
   */
  const loadPersistedData = useCallback(() => {
    return timeTableStorage.loadAll({
      data: defaultCards,
      theme: defaultTheme,
    });
  }, []);

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
   * 모든 데이터 한번에 저장
   */
  const saveAll = useCallback(
    (payload: { data: TDefaultCard[]; theme: TTheme }) => {
      return timeTableStorage.saveAll(payload);
    },
    []
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
 */
export const useAutoSavePersistence = (
  data: TDefaultCard[],
  theme: TTheme,
  autoSaveDelay: number = 1000
) => {
  const { saveAll } = useFormPersistence();

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
 */
export const useBeforeUnloadSave = (data: TDefaultCard[], theme: TTheme) => {
  const { saveAll } = useFormPersistence();

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
   * 시간 필드 저장
   */
  saveTimeField: (
    dayIndex: number,
    time: string,
    currentData: TDefaultCard[]
  ) => {
    return fieldSavers.saveCardField(dayIndex, "time", time, currentData);
  },

  /**
   * 주제 필드 저장
   */
  saveTopicField: (
    dayIndex: number,
    topic: string,
    currentData: TDefaultCard[]
  ) => {
    return fieldSavers.saveCardField(dayIndex, "topic", topic, currentData);
  },

  /**
   * 설명 필드 저장
   */
  saveDescriptionField: (
    dayIndex: number,
    description: string,
    currentData: TDefaultCard[]
  ) => {
    return fieldSavers.saveCardField(
      dayIndex,
      "description",
      description,
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
