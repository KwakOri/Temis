import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import {
  v2_createInitialGlobalDataFromFormSchema,
  v2_getDefaultCardsFromFormSchema,
} from "@/utils/time-table/v2-form-data";
import { v2_toCardInputConfig } from "@/utils/time-table/v2-form-schema-adapter";
import { useEffect, useMemo, useState } from "react";
import { useTemplateData } from "./useTemplateData";
import { useTemplatePersistence } from "./useTemplatePersistence";
import { useTemplateState } from "./useTemplateState";
import { useTemplateTheme } from "./useTemplateTheme";

export interface UseTemplateEditorOptions {
  inputSchema: V2TemplateFormSchema;
  defaultTheme?: TTheme;
  autoSaveDelay?: number;
  captureSize?: { width: number; height: number };
}

export const useTemplateEditor = ({
  inputSchema,
  defaultTheme = "first",
  autoSaveDelay = 1000,
  captureSize,
}: UseTemplateEditorOptions) => {
  const cardInputConfig = useMemo(
    () => v2_toCardInputConfig(inputSchema),
    [inputSchema]
  );
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

  const { saveData, loadPersistedData, clearAllData, autoSave } =
    useTemplatePersistence({
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
        const configMatches =
          persistedData.cardInputConfig &&
          JSON.stringify(persistedData.cardInputConfig) ===
            JSON.stringify(cardInputConfig);

        if (configMatches) {
          updateData(persistedData.data);
          updateGlobalData(
            persistedData.globalData ??
              v2_createInitialGlobalDataFromFormSchema({
                formSchema: inputSchema,
              })
          );
          if (persistedData.theme) {
            updateTheme(persistedData.theme);
          }
        } else {
          const newDefaultCards = v2_getDefaultCardsFromFormSchema({
            formSchema: inputSchema,
          });
          updateData(newDefaultCards);
          updateGlobalData(
            v2_createInitialGlobalDataFromFormSchema({
              formSchema: inputSchema,
            })
          );
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
    cardInputConfig,
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
    saveData,
    loadPersistedData,
    clearAllData,
    autoSave,
    resetAll,
    inputSchema,
    cardInputConfig,
    defaultTheme,
    captureSize,
    isInitialized,
  };
};
