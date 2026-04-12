"use client";

import { TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { useMemo } from "react";

interface UseTemplateSampleDataActionsParams {
  data: TDefaultCard[];
  updateData: (next: TDefaultCard[]) => void;
  globalData: TGlobalData;
  updateGlobalData: (next: TGlobalData) => void;
}

const useTemplateSampleDataActions = ({
  data,
  updateData,
  globalData,
  updateGlobalData,
}: UseTemplateSampleDataActionsParams) => {
  const firstCard = useMemo(() => data[0], [data]);
  const firstEntries = useMemo(() => firstCard?.entries ?? [], [firstCard]);
  const firstEntry = useMemo(() => firstEntries[0], [firstEntries]);

  const createDefaultEntry = () => {
    const seed = firstEntries[0] ?? {};
    return {
      time: typeof seed.time === "string" ? seed.time : "10:00",
      mainTitle: typeof seed.mainTitle === "string" ? seed.mainTitle : "",
      subTitle: typeof seed.subTitle === "string" ? seed.subTitle : "",
      isGuerrilla:
        typeof seed.isGuerrilla === "boolean" ? seed.isGuerrilla : false,
    };
  };

  const updateFirstEntryField = (
    entryIndex: number,
    key: string,
    value: string | number | boolean
  ) => {
    const next = [...data];
    if (!next[0] || !next[0].entries?.length) return;
    if (entryIndex < 0 || entryIndex >= next[0].entries.length) return;

    next[0] = {
      ...next[0],
      entries: next[0].entries.map((entry, index) => {
        if (index !== entryIndex) return entry;
        return {
          ...entry,
          [key]: value,
        };
      }),
    };

    updateData(next);
  };

  const addFirstEntry = (maxEntries: number) => {
    const next = [...data];
    if (!next[0]) return;
    const safeMaxEntries = Math.max(1, maxEntries);
    const entries = Array.isArray(next[0].entries) ? [...next[0].entries] : [];
    if (entries.length >= safeMaxEntries) return;
    entries.push(createDefaultEntry());
    next[0] = {
      ...next[0],
      entries,
    };
    updateData(next);
  };

  const removeFirstEntry = (entryIndex: number) => {
    const next = [...data];
    if (!next[0]) return;
    const entries = Array.isArray(next[0].entries) ? [...next[0].entries] : [];
    if (entries.length <= 1) return;
    if (entryIndex < 0 || entryIndex >= entries.length) return;
    entries.splice(entryIndex, 1);
    if (entries.length === 0) {
      entries.push(createDefaultEntry());
    }
    next[0] = {
      ...next[0],
      entries,
    };
    updateData(next);
  };

  const updateFirstCardField = (
    key: string,
    value: string | number | boolean
  ) => {
    const next = [...data];
    if (!next[0]) return;
    next[0] = {
      ...next[0],
      [key]: value,
    };
    updateData(next);
  };

  const updateGlobalSampleField = (key: string, value: string | number) => {
    updateGlobalData({
      ...globalData,
      [key]: value,
    });
  };

  const updateFirstDayOffline = (isOffline: boolean) => {
    const next = [...data];
    if (!next[0]) return;
    next[0] = {
      ...next[0],
      isOffline,
    };
    updateData(next);
  };

  return {
    firstCard,
    firstEntries,
    firstEntry,
    updateFirstEntryField,
    addFirstEntry,
    removeFirstEntry,
    updateFirstCardField,
    updateGlobalSampleField,
    updateFirstDayOffline,
  };
};

export default useTemplateSampleDataActions;
