import { useTimeTablePersistence } from "@/hooks/useTimeTablePersistence";
import {
  CardInputConfig,
  TDefaultCard,
  TGlobalData,
} from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";

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
}: UseTemplatePersistenceOptions) =>
  useTimeTablePersistence(
    data,
    globalData,
    currentTheme,
    inputSchema,
    defaultTheme,
    autoSaveDelay
  );

// Backward-compatible alias during migration.
export const useV2TimeTablePersistence = useTemplatePersistence;
