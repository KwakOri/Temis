import { TTheme } from "@/types/time-table/theme";
import { useCallback, useState } from "react";

export const useTemplateTheme = (defaultTheme: TTheme = "first") => {
  const [currentTheme, setCurrentTheme] = useState<TTheme>(defaultTheme);

  const updateTheme = useCallback((theme: TTheme) => {
    setCurrentTheme(theme);
  }, []);

  const handleThemeChange = useCallback((theme: TTheme) => {
    setCurrentTheme(theme);
  }, []);

  const resetTheme = useCallback(() => {
    setCurrentTheme(defaultTheme);
  }, [defaultTheme]);

  const toggleTheme = useCallback((newTheme: TTheme) => {
    setCurrentTheme(newTheme);
  }, []);

  return {
    currentTheme,
    updateTheme,
    handleThemeChange,
    resetTheme,
    toggleTheme,
  };
};
