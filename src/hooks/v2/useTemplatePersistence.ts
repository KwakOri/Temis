import { useCallback, useEffect, useMemo } from "react";
import { TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import {
  v2_createInitialGlobalDataFromFormSchema,
  v2_getDefaultCardsFromFormSchema,
} from "@/utils/v2/v2-form-data";

export interface UseTemplatePersistenceOptions {
  data: TDefaultCard[];
  globalData: TGlobalData;
  currentTheme: TTheme;
  inputSchema: V2TemplateFormSchema;
  defaultTheme: TTheme;
  autoSaveDelay?: number;
}

export const useTemplatePersistence = ({
  data,
  globalData,
  currentTheme,
  inputSchema,
  defaultTheme,
}: UseTemplatePersistenceOptions) => {
  const defaultCards = useMemo(
    () => v2_getDefaultCardsFromFormSchema({ formSchema: inputSchema }),
    [inputSchema]
  );
  const defaultGlobalData = useMemo(
    () => v2_createInitialGlobalDataFromFormSchema({ formSchema: inputSchema }),
    [inputSchema]
  );

  const loadPersistedData = useCallback(
    () => ({
      data: defaultCards,
      globalData: defaultGlobalData,
      theme: defaultTheme,
    }),
    [defaultCards, defaultGlobalData, defaultTheme]
  );

  const clearAllData = useCallback(() => true, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("Template persistence data updated:", {
        dataLength: data.length,
        globalDataLength: Object.keys(globalData).length,
        currentTheme,
        inputSchemaFields: inputSchema.fields.length,
      });
    }
  }, [inputSchema.fields.length, currentTheme, data, globalData]);

  return {
    loadPersistedData,
    clearAllData,
  };
};
