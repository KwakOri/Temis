import { useEffect } from "react";
import { CardInputConfig, TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { 
  useFormPersistence, 
  useAutoSavePersistence, 
  useBeforeUnloadSave 
} from "@/utils/time-table/formPersistence";

/**
 * 타임테이블 데이터 지속성 관리 훅
 * 통합된 formPersistence 유틸리티를 사용합니다.
 */
export const useTimeTablePersistence = (
  data: TDefaultCard[],
  globalData: TGlobalData,
  currentTheme: TTheme,
  cardInputConfig: CardInputConfig,
  defaultTheme: TTheme,
  autoSaveDelay: number = 1000
) => {
  // 기본 지속성 기능
  const formPersistence = useFormPersistence(cardInputConfig, defaultTheme);

  // 자동 저장 기능
  const autoSave = useAutoSavePersistence(
    data,
    globalData,
    currentTheme,
    cardInputConfig,
    defaultTheme,
    autoSaveDelay
  );

  // 브라우저 종료 시 저장
  useBeforeUnloadSave(
    data,
    globalData,
    currentTheme,
    cardInputConfig,
    defaultTheme
  );

  // 디버깅을 위한 저장 상태 로깅 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("TimeTable persistence data updated:", {
        dataLength: data.length,
        globalDataLength: Object.keys(globalData).length,
        currentTheme,
        cardInputConfigFields: cardInputConfig.fields.length,
      });
    }
  }, [data, globalData, currentTheme, cardInputConfig]);

  return {
    // 저장/로드 함수들 (formPersistence에서 가져옴)
    saveData: formPersistence.saveData,
    loadPersistedData: formPersistence.loadPersistedData,
    clearAllData: formPersistence.clearAllData,
    
    // 자동 저장 함수 (수동 트리거용)
    autoSave,
  };
};
