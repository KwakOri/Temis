import { Themes } from "@/utils/time-table/data";

export type TTheme = (typeof Themes)[number];

export interface TButtonTheme {
  value: TTheme;
  label: string;
}
