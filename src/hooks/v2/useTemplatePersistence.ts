import { useEffect, useMemo } from "react";
import {
  TDefaultCard,
  TGlobalData,
} from "@/types/time-table/data";
import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import {
  useAutoSavePersistence,
  useBeforeUnloadSave,
  useFormPersistence,
} from "@/utils/time-table/formPersistence";
import { v2_toCardInputConfig } from "@/utils/time-table/v2-form-schema-adapter";

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
  autoSaveDelay = 1000,
}: UseTemplatePersistenceOptions) => {
  const cardInputConfig = useMemo(
    () => v2_toCardInputConfig(inputSchema),
    [inputSchema]
  );

  const formPersistence = useFormPersistence(cardInputConfig, defaultTheme);

  const autoSave = useAutoSavePersistence(
    data,
    globalData,
    currentTheme,
    cardInputConfig,
    defaultTheme,
    autoSaveDelay
  );

  useBeforeUnloadSave(
    data,
    globalData,
    currentTheme,
    cardInputConfig,
    defaultTheme
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("Template persistence data updated:", {
        dataLength: data.length,
        globalDataLength: Object.keys(globalData).length,
        currentTheme,
        inputSchemaFields: cardInputConfig.fields.length,
      });
    }
  }, [cardInputConfig.fields.length, currentTheme, data, globalData]);

  return {
    saveData: formPersistence.saveData,
    loadPersistedData: formPersistence.loadPersistedData,
    clearAllData: formPersistence.clearAllData,
    autoSave,
  };
};
