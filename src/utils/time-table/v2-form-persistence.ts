import {
  TDefaultCard,
  TGlobalData,
} from "@/types/time-table/data";
import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import { useMemo } from "react";
import {
  useAutoSavePersistence,
  useBeforeUnloadSave,
  useFormPersistence,
} from "./formPersistence";
import { v2_toCardInputConfig } from "./v2-form-schema-adapter";

export const useV2FormPersistence = (
  formSchema: V2TemplateFormSchema,
  defaultTheme: TTheme
) => {
  const cardInputConfig = useMemo(
    () => v2_toCardInputConfig(formSchema),
    [formSchema]
  );

  return useFormPersistence(cardInputConfig, defaultTheme);
};

export const useV2AutoSavePersistence = (
  data: TDefaultCard[],
  globalData: TGlobalData,
  theme: TTheme,
  formSchema: V2TemplateFormSchema,
  defaultTheme: TTheme,
  autoSaveDelay: number = 1000
) => {
  const cardInputConfig = useMemo(
    () => v2_toCardInputConfig(formSchema),
    [formSchema]
  );

  return useAutoSavePersistence(
    data,
    globalData,
    theme,
    cardInputConfig,
    defaultTheme,
    autoSaveDelay
  );
};

export const useV2BeforeUnloadSave = (
  data: TDefaultCard[],
  globalData: TGlobalData,
  theme: TTheme,
  formSchema: V2TemplateFormSchema,
  defaultTheme: TTheme
) => {
  const cardInputConfig = useMemo(
    () => v2_toCardInputConfig(formSchema),
    [formSchema]
  );

  useBeforeUnloadSave(data, globalData, theme, cardInputConfig, defaultTheme);
};
