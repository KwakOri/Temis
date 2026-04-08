import { useTimeTablePersistence } from "@/hooks/useTimeTablePersistence";
import {
  CardInputConfig,
  TDefaultCard,
  TGlobalData,
} from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";

export interface UseV2TimeTablePersistenceOptions {
  data: TDefaultCard[];
  globalData: TGlobalData;
  currentTheme: TTheme;
  inputSchema: CardInputConfig;
  defaultTheme: TTheme;
  autoSaveDelay?: number;
}

export const useV2TimeTablePersistence = ({
  data,
  globalData,
  currentTheme,
  inputSchema,
  defaultTheme,
  autoSaveDelay = 1000,
}: UseV2TimeTablePersistenceOptions) =>
  useTimeTablePersistence(
    data,
    globalData,
    currentTheme,
    inputSchema,
    defaultTheme,
    autoSaveDelay
  );

