import { useCallback, useState } from "react";
import { TTheme, defaultTheme } from "../_settings/settings";
import { useFormPersistence } from "../_utils/formPersistence";

/**
 * 타임테이블 테마 상태 관리 훅
 */
export const useTimeTableTheme = () => {
  const { loadPersistedData } = useFormPersistence();

  // localStorage에서 저장된 테마 로드하여 초기값 설정
  const [currentTheme, setCurrentTheme] = useState<TTheme>(defaultTheme);

  // 테마 업데이트 함수
  const updateTheme = useCallback((theme: TTheme) => {
    setCurrentTheme(theme);
  }, []);

  // 테마 변경 핸들러 (updateTheme과 동일하지만 명시적 이름)
  const handleThemeChange = useCallback((theme: TTheme) => {
    setCurrentTheme(theme);
  }, []);

  // 테마를 기본값으로 리셋
  const resetTheme = useCallback(() => {
    setCurrentTheme(defaultTheme);
  }, []);

  // 테마 토글 (main 테마만 있어서 현재는 의미 없지만 확장성을 위해)
  const toggleTheme = useCallback(() => {
    // 현재 main 테마만 있어서 기본값으로 설정
    setCurrentTheme(defaultTheme);
  }, []);

  return {
    // 상태
    currentTheme,

    // 업데이트 함수들
    updateTheme,
    handleThemeChange,

    // 유틸리티 함수들
    resetTheme,
    toggleTheme,
  };
};
