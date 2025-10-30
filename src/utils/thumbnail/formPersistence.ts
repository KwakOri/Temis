import { CardInputConfig, TDynamicCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { useCallback, useEffect, useMemo } from "react";
import { createInitialCardFromConfig } from "../time-table/data";
import {
  clearAllThumbnailStorage,
  createAutoSave,
  thumbnailStorage,
} from "./localStorage";

/**
 * 썸네일 폼 데이터 지속성을 위한 커스텀 훅
 * CardInputConfig를 받아서 동적으로 기본값을 생성합니다.
 */
export const useThumbnailFormPersistence = (
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme
) => {
  /**
   * 컴포넌트 마운트 시 저장된 데이터 로드
   * CardInputConfig도 함께 반환하여 호환성 검증에 사용
   */
  const loadPersistedData = useCallback(() => {
    const defaultCard = createInitialCardFromConfig({ cardInputConfig });
    const loadedData = thumbnailStorage.loadAll({
      data: defaultCard,
      theme: defaultTheme,
      cardInputConfig: cardInputConfig,
    });

    // 데이터 안전 로드 적용
    const validatedData = thumbnailStorage.loadDataSafely(loadedData.data);

    return {
      ...loadedData,
      data: validatedData,
    };
  }, [cardInputConfig, defaultTheme]);

  /**
   * 데이터 저장 함수
   */
  const saveData = useCallback((data: TDynamicCard) => {
    return thumbnailStorage.saveData(data);
  }, []);

  const saveTheme = useCallback((theme: TTheme) => {
    return thumbnailStorage.saveTheme(theme);
  }, []);

  /**
   * 모든 데이터 한번에 저장 (CardInputConfig 포함)
   */
  const saveAll = useCallback(
    (payload: { data: TDynamicCard; theme: TTheme }) => {
      return thumbnailStorage.saveAll({
        ...payload,
        cardInputConfig: cardInputConfig,
      });
    },
    [cardInputConfig]
  );

  /**
   * 데이터 초기화
   */
  const clearAllData = useCallback(() => {
    return clearAllThumbnailStorage();
  }, []);

  return {
    // 로드 함수
    loadPersistedData,

    // 개별 저장 함수들
    saveData,
    saveTheme,

    // 일괄 저장
    saveAll,

    // 초기화
    clearAllData,
  };
};

/**
 * 자동 저장 기능을 포함한 훅
 * CardInputConfig와 defaultTheme을 받아서 useThumbnailFormPersistence를 사용합니다.
 */
export const useThumbnailAutoSavePersistence = (
  data: TDynamicCard,
  theme: TTheme,
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme,
  autoSaveDelay: number = 1000
) => {
  const { saveAll } = useThumbnailFormPersistence(cardInputConfig, defaultTheme);

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
 * CardInputConfig와 defaultTheme을 받아서 useThumbnailFormPersistence를 사용합니다.
 */
export const useThumbnailBeforeUnloadSave = (
  data: TDynamicCard,
  theme: TTheme,
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme
) => {
  const { saveAll } = useThumbnailFormPersistence(cardInputConfig, defaultTheme);

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
 * 공용 함수이므로 thumbnailStorage를 직접 사용합니다.
 */
export const fieldSavers = {
  /**
   * 특정 필드 저장
   */
  saveCardField: (
    fieldKey: keyof TDynamicCard,
    value: string | number | boolean,
    currentData: TDynamicCard
  ) => {
    const updatedCard = { ...currentData, [fieldKey]: value };
    return thumbnailStorage.saveData(updatedCard);
  },

  /**
   * 오프라인 토글 저장
   */
  saveOfflineToggle: (isOffline: boolean, currentData: TDynamicCard) => {
    return fieldSavers.saveCardField("isOffline", isOffline, currentData);
  },

  /**
   * 동적 필드 저장 (CardInputConfig에 정의된 필드들)
   */
  saveDynamicField: (
    fieldKey: string,
    value: string | number | boolean,
    currentData: TDynamicCard
  ) => {
    return fieldSavers.saveCardField(
      fieldKey as keyof TDynamicCard,
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
  createBackup: (data: TDynamicCard, theme: TTheme, scale: number) => {
    const backup = {
      data,
      theme,
      scale,
      timestamp: new Date().toISOString(),
    };

    return localStorage.setItem(
      "template-thumbnail-backup",
      JSON.stringify(backup)
    );
  },

  /**
   * 백업에서 데이터 복원
   */
  restoreFromBackup: () => {
    try {
      const backupData = localStorage.getItem("template-thumbnail-backup");
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
    localStorage.removeItem("template-thumbnail-backup");
  },
};
