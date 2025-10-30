import { useEffect } from "react";
import { CardInputConfig, TDynamicCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  useThumbnailFormPersistence,
  useThumbnailAutoSavePersistence,
  useThumbnailBeforeUnloadSave,
} from "@/utils/thumbnail/formPersistence";

/**
 * 썸네일 데이터 지속성 관리 훅
 * 단일 카드 데이터를 localStorage에 저장/로드
 */
export const useThumbnailPersistence = (
  data: TDynamicCard,
  currentTheme: TTheme,
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme,
  autoSaveDelay: number = 1000
) => {
  // 기본 지속성 기능
  const formPersistence = useThumbnailFormPersistence(
    cardInputConfig,
    defaultTheme
  );

  // 자동 저장 기능
  const autoSave = useThumbnailAutoSavePersistence(
    data,
    currentTheme,
    cardInputConfig,
    defaultTheme,
    autoSaveDelay
  );

  // 브라우저 종료 시 저장
  useThumbnailBeforeUnloadSave(data, currentTheme, cardInputConfig, defaultTheme);

  // 디버깅을 위한 저장 상태 로깅 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("Thumbnail persistence data updated:", {
        entriesCount: data.entries.length,
        currentTheme,
        cardInputConfigFields: cardInputConfig.fields.length,
      });
    }
  }, [data, currentTheme, cardInputConfig]);

  return {
    // 저장/로드 함수들 (formPersistence에서 가져옴)
    saveData: formPersistence.saveData,
    loadPersistedData: formPersistence.loadPersistedData,
    clearAllData: formPersistence.clearAllData,

    // 자동 저장 함수 (수동 트리거용)
    autoSave,
  };
};
