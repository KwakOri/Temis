import { useTimeTableEditor } from "@/hooks/useTimeTableEditor";
import { CardInputConfig } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";

export interface UseV2TimeTableEditorOptions {
  inputSchema: CardInputConfig;
  defaultTheme?: TTheme;
  autoSaveDelay?: number;
  captureSize?: { width: number; height: number };
}

export const useV2TimeTableEditor = ({
  inputSchema,
  defaultTheme = "first",
  autoSaveDelay = 1000,
  captureSize,
}: UseV2TimeTableEditorOptions) => {
  const runtime = useTimeTableEditor({
    cardInputConfig: inputSchema,
    defaultTheme,
    autoSaveDelay,
    captureSize,
  });

  return {
    ...runtime,
    inputSchema,
  };
};

