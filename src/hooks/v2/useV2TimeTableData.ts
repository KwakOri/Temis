import {
  CardInputConfig,
  TDefaultCard,
  TFieldValue,
  TGlobalData,
} from "@/types/time-table/data";
import {
  createInitialCardFromConfig,
  createInitialEntryFromConfig,
  createInitialGlobalDataFromConfig,
  getDefaultCards,
  week,
} from "@/utils/time-table/data";
import { useCallback, useState } from "react";

export interface UseV2TimeTableDataOptions {
  inputSchema: CardInputConfig;
}

export const useV2TimeTableData = ({
  inputSchema,
}: UseV2TimeTableDataOptions) => {
  const [data, setData] = useState<TDefaultCard[]>(() => {
    return getDefaultCards({ cardInputConfig: inputSchema });
  });
  const [globalData, setGlobalData] = useState<TGlobalData>(() => {
    return createInitialGlobalDataFromConfig({ cardInputConfig: inputSchema });
  });

  const updateData = useCallback((newData: TDefaultCard[]) => {
    setData(newData);
  }, []);

  const updateGlobalData = useCallback((newGlobalData: TGlobalData) => {
    setGlobalData(newGlobalData);
  }, []);

  const updateGlobalField = useCallback((fieldKey: string, value: TFieldValue) => {
    setGlobalData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  }, []);

  const updateCard = useCallback(
    (dayIndex: number, cardData: Partial<TDefaultCard>) => {
      setData((prevData) => {
        const next = [...prevData];
        if (dayIndex >= 0 && dayIndex < next.length) {
          next[dayIndex] = { ...next[dayIndex], ...cardData };
        }
        return next;
      });
    },
    []
  );

  const updateCardField = useCallback(
    (
      dayIndex: number,
      fieldKey: keyof TDefaultCard,
      value:
        | string
        | number
        | boolean
        | Array<{ text: string; checked: boolean }>
        | undefined
    ) => {
      updateCard(dayIndex, { [fieldKey]: value } as Partial<TDefaultCard>);
    },
    [updateCard]
  );

  const updateEntryField = useCallback(
    (
      dayIndex: number,
      entryIndex: number,
      fieldKey: string,
      value:
        | string
        | number
        | boolean
        | Array<{ text: string; checked: boolean }>
        | undefined
    ) => {
      setData((prevData) => {
        const next = [...prevData];
        if (dayIndex >= 0 && dayIndex < next.length) {
          const entries = [...next[dayIndex].entries];
          if (entryIndex >= 0 && entryIndex < entries.length) {
            entries[entryIndex] = {
              ...entries[entryIndex],
              [fieldKey]: value,
            };
            next[dayIndex] = { ...next[dayIndex], entries };
          }
        }
        return next;
      });
    },
    []
  );

  const addEntry = useCallback(
    (dayIndex: number) => {
      setData((prevData) => {
        const next = [...prevData];
        if (dayIndex >= 0 && dayIndex < next.length) {
          const newEntry = createInitialEntryFromConfig({
            cardInputConfig: inputSchema,
          });
          next[dayIndex] = {
            ...next[dayIndex],
            entries: [...next[dayIndex].entries, newEntry],
          };
        }
        return next;
      });
    },
    [inputSchema]
  );

  const removeEntry = useCallback(
    (dayIndex: number, entryIndex: number) => {
      setData((prevData) => {
        const next = [...prevData];
        if (dayIndex >= 0 && dayIndex < next.length) {
          const entries = next[dayIndex].entries.filter(
            (_, index) => index !== entryIndex
          );
          if (entries.length === 0) {
            entries.push(
              createInitialEntryFromConfig({ cardInputConfig: inputSchema })
            );
          }
          next[dayIndex] = { ...next[dayIndex], entries };
        }
        return next;
      });
    },
    [inputSchema]
  );

  const toggleOffline = useCallback((dayIndex: number) => {
    setData((prevData) => {
      const next = [...prevData];
      if (dayIndex >= 0 && dayIndex < next.length) {
        next[dayIndex] = {
          ...next[dayIndex],
          isOffline: !next[dayIndex].isOffline,
        };
      }
      return next;
    });
  }, []);

  const resetData = useCallback(() => {
    const fresh = week.map((day) => ({
      day,
      ...createInitialCardFromConfig({ cardInputConfig: inputSchema }),
    })) as TDefaultCard[];

    fresh.forEach((card) => {
      card.isOffline = false;
    });

    setData(fresh);
    setGlobalData(createInitialGlobalDataFromConfig({ cardInputConfig: inputSchema }));
  }, [inputSchema]);

  const resetGlobalData = useCallback(() => {
    setGlobalData(createInitialGlobalDataFromConfig({ cardInputConfig: inputSchema }));
  }, [inputSchema]);

  const resetCard = useCallback(
    (dayIndex: number) => {
      if (dayIndex >= 0 && dayIndex < week.length) {
        const freshCard = {
          day: week[dayIndex],
          ...createInitialCardFromConfig({ cardInputConfig: inputSchema }),
        } as TDefaultCard;
        freshCard.isOffline = false;
        updateCard(dayIndex, freshCard);
      }
    },
    [updateCard, inputSchema]
  );

  return {
    data,
    globalData,
    updateData,
    updateGlobalData,
    updateGlobalField,
    updateCard,
    updateCardField,
    updateEntryField,
    toggleOffline,
    addEntry,
    removeEntry,
    resetData,
    resetGlobalData,
    resetCard,
  };
};
