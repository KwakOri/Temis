import { useTimeTableState } from "@/hooks/useTimeTableState";
import { useTimeTableData } from "./useTimeTableData";
import { useTimeTableTheme } from "./useTimeTableTheme";

import { useTimeTablePersistence } from "./useTimeTablePersistence";

/**
 * TimeTableEditor의 모든 상태와 로직을 통합 관리하는 메인 훅
 *
 * 이 훅은 다음과 같은 관심사를 분리하여 관리합니다:
 * - 데이터 상태 (useTimeTableData)
 * - 테마 상태 (useTimeTableTheme)
 * - 프로필 상태 (useTimeTableProfile)
 * - 지속성 관리 (useTimeTablePersistence)
 */
export const useTimeTableEditor = () => {
  // 전역 상태 (Context에서 관리)
  const { state } = useTimeTableState();

  // 개별 상태 관리 훅들
  const {
    data,
    updateData,
    updateCard,
    updateCardField,
    toggleOffline,
    resetData,
    resetCard,
  } = useTimeTableData();

  const { currentTheme, updateTheme, handleThemeChange, resetTheme } =
    useTimeTableTheme();

  // 데이터 지속성 관리
  const { autoSave } = useTimeTablePersistence(data, currentTheme, 1000);

  // 통합된 상태와 함수들을 반환
  return {
    // 전역 상태
    state,

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

    // 프로필 상태와 함수들
    // 지속성 관리
    autoSave,
  };
};
