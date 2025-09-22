import { CardInputConfig } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { getDefaultCards } from "@/utils/time-table/data";
import { useEffect, useState } from "react";
import { useTimeTableData } from "./useTimeTableData";
import { useTimeTablePersistence } from "./useTimeTablePersistence";
import { useTimeTableState } from "./useTimeTableState";
import { useTimeTableTheme } from "./useTimeTableTheme";

/**
 * TimeTableEditor의 모든 상태와 로직을 통합 관리하는 메인 훅
 * CardInputConfig를 받아서 다른 모든 훅에 전파하는 방식
 *
 * 이 훅은 다음과 같은 관심사를 분리하여 관리합니다:
 * - 전역 상태 (useTimeTableState)
 * - 데이터 상태 (useTimeTableData) - CardInputConfig 기반
 * - 테마 상태 (useTimeTableTheme)
 * - 지속성 관리 (useTimeTablePersistence)
 */
export const useTimeTableEditor = ({
  cardInputConfig,
  defaultTheme = "first" as TTheme,
  autoSaveDelay = 1000,
  captureSize,
}: {
  cardInputConfig: CardInputConfig;
  defaultTheme?: TTheme;
  autoSaveDelay?: number;
  captureSize?: { width: number; height: number };
}) => {
  // 전역 상태 (Context에서 관리)
  const { state, actions } = useTimeTableState(captureSize);

  // 개별 상태 관리 훅들 (CardInputConfig 전파)
  const {
    data,
    updateData,
    updateCard,
    updateCardField,
    toggleOffline,
    resetData,
    resetCard,
  } = useTimeTableData({ cardInputConfig });

  const { currentTheme, updateTheme, handleThemeChange, resetTheme } =
    useTimeTableTheme(defaultTheme);

  // 데이터 지속성 관리 (CardInputConfig 포함)
  const { saveData, loadPersistedData, clearAllData, autoSave } =
    useTimeTablePersistence(
      data,
      currentTheme,
      cardInputConfig,
      defaultTheme,
      autoSaveDelay
    );

  // 초기 데이터 로드 (localStorage에서 복원)
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      const persistedData = loadPersistedData();

      if (persistedData && persistedData.data) {
        // CardInputConfig가 일치하는지 확인
        const configMatches =
          persistedData.cardInputConfig &&
          JSON.stringify(persistedData.cardInputConfig) ===
            JSON.stringify(cardInputConfig);

        if (configMatches) {
          // 설정이 일치하면 저장된 데이터 복원
          updateData(persistedData.data);
          if (persistedData.theme) {
            updateTheme(persistedData.theme);
          }
        } else {
          // 설정이 다르면 새로운 기본값으로 초기화
          const newDefaultCards = getDefaultCards({ cardInputConfig });
          updateData(newDefaultCards);
        }
      }

      setIsInitialized(true);
    }
  }, [
    isInitialized,
    loadPersistedData,
    updateData,
    updateTheme,
    cardInputConfig,
  ]);

  // 통합된 리셋 함수 (모든 상태를 한 번에 리셋)
  const resetAll = () => {
    resetData();
    resetTheme();
    clearAllData();
  };

  // 통합된 상태와 함수들을 반환
  return {
    // 전역 상태
    state,
    actions,

    // 데이터 상태와 함수들
    data,
    updateData,
    updateCard,
    updateCardField,
    toggleOffline,
    resetData,
    resetCard,

    // 테마 상태와 함수들
    currentTheme,
    updateTheme,
    handleThemeChange,
    resetTheme,

    // 지속성 관리
    saveData,
    loadPersistedData,
    clearAllData,
    autoSave,

    // 통합 관리 함수들
    resetAll,

    // 설정 정보
    cardInputConfig,
    captureSize,
    isInitialized,
  };
};
