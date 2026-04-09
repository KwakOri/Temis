import {
  TDefaultCard,
  TFieldValue,
  TGlobalData,
} from "@/types/time-table/data";
import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import {
  createInitialCardFromConfig,
  createInitialEntryFromConfig,
  createInitialGlobalDataFromConfig,
  getDefaultCards,
  week,
} from "@/utils/time-table/data";
import { v2_toCardInputConfig } from "@/utils/time-table/v2-form-schema-adapter";
import { useCallback, useMemo, useState } from "react";

export interface UseTemplateDataOptions {
  inputSchema: V2TemplateFormSchema;
}

export const useTemplateData = ({
  inputSchema,
}: UseTemplateDataOptions) => {
  const cardInputConfig = useMemo(
    () => v2_toCardInputConfig(inputSchema),
    [inputSchema]
  );

  const [data, setData] = useState<TDefaultCard[]>(() => {
    return getDefaultCards({ cardInputConfig });
  });
  const [globalData, setGlobalData] = useState<TGlobalData>(() => {
    return createInitialGlobalDataFromConfig({ cardInputConfig });
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
            cardInputConfig,
          });
          next[dayIndex] = {
            ...next[dayIndex],
            entries: [...next[dayIndex].entries, newEntry],
          };
        }
        return next;
      });
    },
    [cardInputConfig]
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
            entries.push(createInitialEntryFromConfig({ cardInputConfig }));
          }
          next[dayIndex] = { ...next[dayIndex], entries };
        }
        return next;
      });
    },
    [cardInputConfig]
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
      ...createInitialCardFromConfig({ cardInputConfig }),
    })) as TDefaultCard[];

    fresh.forEach((card) => {
      card.isOffline = false;
    });

    setData(fresh);
    setGlobalData(createInitialGlobalDataFromConfig({ cardInputConfig }));
  }, [cardInputConfig]);

  const resetGlobalData = useCallback(() => {
    setGlobalData(createInitialGlobalDataFromConfig({ cardInputConfig }));
  }, [cardInputConfig]);

  const resetCard = useCallback(
    (dayIndex: number) => {
      if (dayIndex >= 0 && dayIndex < week.length) {
        const freshCard = {
          day: week[dayIndex],
          ...createInitialCardFromConfig({ cardInputConfig }),
        } as TDefaultCard;
        freshCard.isOffline = false;
        updateCard(dayIndex, freshCard);
      }
    },
    [updateCard, cardInputConfig]
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
