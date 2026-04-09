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
  const firstEntry = useMemo(() => firstCard?.entries?.[0], [firstCard]);

  const updateFirstEntryField = (
    key: string,
    value: string | number | boolean
  ) => {
    const next = [...data];
    if (!next[0] || !next[0].entries?.[0]) return;

    next[0] = {
      ...next[0],
      entries: [
        {
          ...next[0].entries[0],
          [key]: value,
        },
        ...next[0].entries.slice(1),
      ],
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
    firstEntry,
    updateFirstEntryField,
    updateFirstCardField,
    updateGlobalSampleField,
    updateFirstDayOffline,
  };
};

export default useTemplateSampleDataActions;
