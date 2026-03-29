export const v2_DATA_VERSION = 2 as const;

export const v2_DAY_VALUE_NAMES = ["offlineMemo"] as const;
export type V2DayValueName = (typeof v2_DAY_VALUE_NAMES)[number];

export const v2_ENTRY_VALUE_NAMES = ["time", "mainTitle", "subTitle"] as const;
export type V2EntryValueName = (typeof v2_ENTRY_VALUE_NAMES)[number];

export type V2ValueName = V2DayValueName | V2EntryValueName;

export interface V2NameValue<TName extends string> {
  name: TName;
  value: string;
}

export type V2DayValue = V2NameValue<V2DayValueName>;
export type V2EntryValue = V2NameValue<V2EntryValueName>;

export interface V2DayState {
  isOffline: boolean;
}

export interface V2EntryState {
  isGuerrilla: boolean;
}

export interface V2EntryData {
  entryState: V2EntryState;
  entryValues: V2EntryValue[];
}

export interface V2DayData {
  day: number;
  dayState: V2DayState;
  dayValues: V2DayValue[];
  entries: V2EntryData[];
}

export interface V2TimeTableData {
  version: typeof v2_DATA_VERSION;
  days: V2DayData[];
}
