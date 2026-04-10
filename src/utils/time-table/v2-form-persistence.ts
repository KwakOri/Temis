import { TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import { useCallback, useEffect, useMemo } from "react";
import { clearAllTimeTableStorage, createAutoSave, timeTableStorage } from "./localStorage";
import {
  v2_createInitialGlobalDataFromFormSchema,
  v2_getDefaultCardsFromFormSchema,
} from "./v2-form-data";

interface V2FormPersistencePayload {
  data: TDefaultCard[];
  globalData?: TGlobalData;
  theme: TTheme;
}

export const useV2FormPersistence = (
  formSchema: V2TemplateFormSchema,
  defaultTheme: TTheme
) => {
  const defaultCards = useMemo(
    () => v2_getDefaultCardsFromFormSchema({ formSchema }),
    [formSchema]
  );
  const defaultGlobalData = useMemo(
    () => v2_createInitialGlobalDataFromFormSchema({ formSchema }),
    [formSchema]
  );

  const loadPersistedData = useCallback(() => {
    return {
      data: timeTableStorage.loadDataSafely(defaultCards),
      globalData: timeTableStorage.loadGlobalData(defaultGlobalData),
      theme: timeTableStorage.loadTheme(defaultTheme),
    };
  }, [defaultCards, defaultGlobalData, defaultTheme]);

  const saveData = useCallback((data: TDefaultCard[]) => {
    return timeTableStorage.saveData(data);
  }, []);

  const saveTheme = useCallback((theme: TTheme) => {
    return timeTableStorage.saveTheme(theme);
  }, []);

  const saveAll = useCallback(
    (payload: V2FormPersistencePayload) => {
      let success = true;
      success = success && timeTableStorage.saveData(payload.data);
      success =
        success &&
        timeTableStorage.saveGlobalData(payload.globalData ?? defaultGlobalData);
      success = success && timeTableStorage.saveTheme(payload.theme);
      return success;
    },
    [defaultGlobalData]
  );

  const clearAllData = useCallback(() => {
    return clearAllTimeTableStorage();
  }, []);

  return {
    loadPersistedData,
    saveData,
    saveTheme,
    saveAll,
    clearAllData,
  };
};

export const useV2AutoSavePersistence = (
  data: TDefaultCard[],
  globalData: TGlobalData,
  theme: TTheme,
  formSchema: V2TemplateFormSchema,
  defaultTheme: TTheme,
  autoSaveDelay: number = 1000
) => {
  const { saveAll } = useV2FormPersistence(formSchema, defaultTheme);

  const autoSave = useMemo(
    () =>
      createAutoSave(() => {
        saveAll({
          data,
          globalData,
          theme,
        });
      }, autoSaveDelay),
    [saveAll, data, globalData, theme, autoSaveDelay]
  );

  useEffect(() => {
    autoSave();
  }, [data, globalData, theme, autoSave]);

  return autoSave;
};

export const useV2BeforeUnloadSave = (
  data: TDefaultCard[],
  globalData: TGlobalData,
  theme: TTheme,
  formSchema: V2TemplateFormSchema,
  defaultTheme: TTheme
) => {
  const { saveAll } = useV2FormPersistence(formSchema, defaultTheme);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      saveAll({
        data,
        globalData,
        theme,
      });
      event.preventDefault();
      event.returnValue = "";
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      saveAll({
        data,
        globalData,
        theme,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [data, globalData, theme, saveAll]);
};
