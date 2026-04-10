import { useEffect } from "react";
import {
  TDefaultCard,
  TGlobalData,
} from "@/types/time-table/data";
import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import {
  useV2AutoSavePersistence,
  useV2BeforeUnloadSave,
  useV2FormPersistence,
} from "@/utils/time-table/v2-form-persistence";

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
  const formPersistence = useV2FormPersistence(inputSchema, defaultTheme);

  useV2AutoSavePersistence(
    data,
    globalData,
    currentTheme,
    inputSchema,
    defaultTheme,
    autoSaveDelay
  );

  useV2BeforeUnloadSave(
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
  }, [inputSchema.fields.length, currentTheme, data, globalData]);

  return {
    loadPersistedData: formPersistence.loadPersistedData,
    clearAllData: formPersistence.clearAllData,
  };
};
