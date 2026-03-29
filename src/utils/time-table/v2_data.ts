import {
  V2DayData,
  V2DayValue,
  V2DayValueName,
  V2EntryData,
  V2EntryValue,
  V2EntryValueName,
  V2TimeTableData,
  v2_DATA_VERSION,
  v2_DAY_VALUE_NAMES,
  v2_ENTRY_VALUE_NAMES,
} from "@/types/time-table/v2_data";

const v2_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const v2_dayNameSet = new Set<string>(v2_DAY_VALUE_NAMES);
const v2_entryNameSet = new Set<string>(v2_ENTRY_VALUE_NAMES);

const v2_ENTRY_VALUE_DEFAULTS: Record<V2EntryValueName, string> = {
  time: "10:00",
  mainTitle: "",
  subTitle: "",
};

export const v2_createEntryValues = (
  overrides: Partial<Record<V2EntryValueName, string>> = {}
): V2EntryValue[] => {
  return v2_ENTRY_VALUE_NAMES.map((name) => ({
    name,
    value: overrides[name] ?? v2_ENTRY_VALUE_DEFAULTS[name],
  }));
};

export const v2_createEntryData = ({
  isGuerrilla = false,
  values,
}: {
  isGuerrilla?: boolean;
  values?: Partial<Record<V2EntryValueName, string>>;
} = {}): V2EntryData => {
  return {
    entryState: { isGuerrilla },
    entryValues: v2_createEntryValues(values),
  };
};

export const v2_createDayData = ({
  day,
  isOffline = false,
  offlineMemo,
}: {
  day: number;
  isOffline?: boolean;
  offlineMemo?: string;
}): V2DayData => {
  const dayValues: V2DayValue[] =
    offlineMemo !== undefined ? [{ name: "offlineMemo", value: offlineMemo }] : [];

  return {
    day,
    dayState: { isOffline },
    dayValues,
    entries: [v2_createEntryData()],
  };
};

export const v2_createDefaultTimeTableData = (): V2TimeTableData => {
  return {
    version: v2_DATA_VERSION,
    days: v2_WEEK_DAYS.map((day) => v2_createDayData({ day })),
  };
};

export const v2_getEntryValue = (
  entry: V2EntryData,
  name: V2EntryValueName
): string => {
  return (
    entry.entryValues.find((item) => item.name === name)?.value ??
    v2_ENTRY_VALUE_DEFAULTS[name]
  );
};

export const v2_setEntryValue = (
  entry: V2EntryData,
  name: V2EntryValueName,
  value: string
): V2EntryData => {
  const valueMap = new Map<V2EntryValueName, string>(
    entry.entryValues.map((item) => [item.name, item.value])
  );
  valueMap.set(name, value);

  return {
    ...entry,
    entryValues: v2_ENTRY_VALUE_NAMES.map((key) => ({
      name: key,
      value: valueMap.get(key) ?? v2_ENTRY_VALUE_DEFAULTS[key],
    })),
  };
};

export const v2_getDayValue = (
  day: V2DayData,
  name: V2DayValueName
): string | undefined => {
  return day.dayValues.find((item) => item.name === name)?.value;
};

export const v2_setDayValue = (
  day: V2DayData,
  name: V2DayValueName,
  value: string
): V2DayData => {
  const filtered = day.dayValues.filter((item) => item.name !== name);
  return {
    ...day,
    dayValues: [...filtered, { name, value }],
  };
};

export const v2_isDayValueName = (value: string): value is V2DayValueName => {
  return v2_dayNameSet.has(value);
};

export const v2_isEntryValueName = (
  value: string
): value is V2EntryValueName => {
  return v2_entryNameSet.has(value);
};

export const v2_validateTimeTableData = (
  data: unknown
): data is V2TimeTableData => {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Partial<V2TimeTableData>;

  if (candidate.version !== v2_DATA_VERSION) return false;
  if (!Array.isArray(candidate.days) || candidate.days.length !== 7) return false;

  return candidate.days.every((day, index) => {
    if (typeof day !== "object" || day === null) return false;

    const dayData = day as Partial<V2DayData>;

    if (dayData.day !== index) return false;
    if (!dayData.dayState || typeof dayData.dayState.isOffline !== "boolean") {
      return false;
    }

    if (!Array.isArray(dayData.dayValues)) return false;
    if (
      !dayData.dayValues.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          typeof item.name === "string" &&
          v2_isDayValueName(item.name) &&
          typeof item.value === "string"
      )
    ) {
      return false;
    }

    if (!Array.isArray(dayData.entries) || dayData.entries.length === 0) return false;

    return dayData.entries.every((entry) => {
      if (typeof entry !== "object" || entry === null) return false;

      const entryData = entry as Partial<V2EntryData>;
      if (
        !entryData.entryState ||
        typeof entryData.entryState.isGuerrilla !== "boolean"
      ) {
        return false;
      }

      if (!Array.isArray(entryData.entryValues)) return false;
      if (
        !entryData.entryValues.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof item.name === "string" &&
            v2_isEntryValueName(item.name) &&
            typeof item.value === "string"
        )
      ) {
        return false;
      }

      const valueNames = new Set(entryData.entryValues.map((item) => item.name));
      return v2_ENTRY_VALUE_NAMES.every((requiredName) =>
        valueNames.has(requiredName)
      );
    });
  });
};
