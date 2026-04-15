import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import {
  v2_createInitialGlobalDataFromFormSchema,
  v2_hydrateCardsFromFormSchema,
  v2_hydrateGlobalDataFromFormSchema,
} from "@/utils/v2/v2-form-data";
import { useEffect, useState } from "react";
import { useTemplateData } from "./useTemplateData";
import { useTemplatePersistence } from "./useTemplatePersistence";
import { useTemplateState } from "./useTemplateState";
import { useTemplateTheme } from "./useTemplateTheme";

export interface UseTemplateRuntimeOptions {
  inputSchema: V2TemplateFormSchema;
  defaultTheme?: TTheme;
  autoSaveDelay?: number;
  captureSize?: { width: number; height: number };
}

export const useTemplateRuntime = ({
  inputSchema,
  defaultTheme = "first",
  autoSaveDelay = 1000,
  captureSize,
}: UseTemplateRuntimeOptions) => {
  const { state, actions } = useTemplateState(captureSize);
  const {
    data,
    globalData,
    updateData,
    updateGlobalData,
    updateCard,
    updateCardField,
    toggleOffline,
    resetData,
    resetCard,
  } = useTemplateData({ inputSchema });

  const { currentTheme, updateTheme, handleThemeChange, resetTheme } =
    useTemplateTheme(defaultTheme);

  const { loadPersistedData, clearAllData } = useTemplatePersistence({
    data,
    globalData,
    currentTheme,
    inputSchema,
    defaultTheme,
    autoSaveDelay,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      const persistedData = loadPersistedData();

      if (persistedData && persistedData.data) {
        updateData(
          v2_hydrateCardsFromFormSchema({
            formSchema: inputSchema,
            data: persistedData.data,
          })
        );
        updateGlobalData(
          v2_hydrateGlobalDataFromFormSchema({
            formSchema: inputSchema,
            globalData:
              persistedData.globalData ??
              v2_createInitialGlobalDataFromFormSchema({
                formSchema: inputSchema,
              }),
          })
        );
        if (persistedData.theme) {
          updateTheme(persistedData.theme);
        }
      }

      setIsInitialized(true);
    }
  }, [
    isInitialized,
    loadPersistedData,
    updateData,
    updateGlobalData,
    updateTheme,
    inputSchema,
  ]);

  const resetAll = () => {
    resetData();
    resetTheme();
    clearAllData();
  };

  return {
    state,
    actions,
    data,
    globalData,
    updateData,
    updateGlobalData,
    updateCard,
    updateCardField,
    toggleOffline,
    resetData,
    resetCard,
    currentTheme,
    updateTheme,
    handleThemeChange,
    resetTheme,
    resetAll,
    isInitialized,
  };
};
