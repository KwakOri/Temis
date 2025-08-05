import { TTheme } from "@/types/time-table/theme";
import { useCallback, useState } from "react";

/**
 * 타임테이블 테마 상태 관리 훅
 * 기본 테마를 받아서 초기화
 */
export const useTimeTableTheme = (defaultTheme: TTheme = "first") => {
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
  }, [defaultTheme]);

  // 테마 토글 (확장성을 위해)
  const toggleTheme = useCallback((newTheme: TTheme) => {
    setCurrentTheme(newTheme);
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
