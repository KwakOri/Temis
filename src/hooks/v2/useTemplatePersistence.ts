import { useEffect } from "react";
import {
  CardInputConfig,
  TDefaultCard,
  TGlobalData,
} from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  useAutoSavePersistence,
  useBeforeUnloadSave,
  useFormPersistence,
} from "@/utils/time-table/formPersistence";

export interface UseTemplatePersistenceOptions {
  data: TDefaultCard[];
  globalData: TGlobalData;
  currentTheme: TTheme;
  inputSchema: CardInputConfig;
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
  const formPersistence = useFormPersistence(inputSchema, defaultTheme);

  const autoSave = useAutoSavePersistence(
    data,
    globalData,
    currentTheme,
    inputSchema,
    defaultTheme,
    autoSaveDelay
  );

  useBeforeUnloadSave(
    data,
    globalData,
    currentTheme,
    inputSchema,
    defaultTheme
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("Template persistence data updated:", {
        dataLength: data.length,
        globalDataLength: Object.keys(globalData).length,
        currentTheme,
        inputSchemaFields: inputSchema.fields.length,
      });
    }
  }, [data, globalData, currentTheme, inputSchema]);

  return {
    saveData: formPersistence.saveData,
    loadPersistedData: formPersistence.loadPersistedData,
    clearAllData: formPersistence.clearAllData,
    autoSave,
  };
};
