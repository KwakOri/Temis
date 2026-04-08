import { useTimeTableData } from "@/hooks/useTimeTableData";
import { CardInputConfig } from "@/types/time-table/data";

export interface UseV2TimeTableDataOptions {
  inputSchema: CardInputConfig;
}

export const useV2TimeTableData = ({ inputSchema }: UseV2TimeTableDataOptions) =>
  useTimeTableData({ cardInputConfig: inputSchema });

