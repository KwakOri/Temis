import {
  TDefaultCard,
  TFieldValue,
  TGlobalData,
} from "@/types/time-table/data";
import { V2TemplateFormSchema } from "@/types/time-table/template-render-config";
import {
  v2_createInitialCardFromFormSchema,
  v2_createInitialEntryFromFormSchema,
  v2_createInitialGlobalDataFromFormSchema,
  v2_getDefaultCardsFromFormSchema,
  v2_WEEK,
} from "@/utils/v2/v2-form-data";
import { useCallback, useState } from "react";

export interface UseTemplateDataOptions {
  inputSchema: V2TemplateFormSchema;
}

export const useTemplateData = ({
  inputSchema,
}: UseTemplateDataOptions) => {
  const [data, setData] = useState<TDefaultCard[]>(() => {
    return v2_getDefaultCardsFromFormSchema({ formSchema: inputSchema });
  });
  const [globalData, setGlobalData] = useState<TGlobalData>(() => {
    return v2_createInitialGlobalDataFromFormSchema({ formSchema: inputSchema });
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
          const newEntry = v2_createInitialEntryFromFormSchema({
            formSchema: inputSchema,
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
              v2_createInitialEntryFromFormSchema({ formSchema: inputSchema })
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
    const fresh = v2_WEEK.map((day) => ({
      day,
      ...v2_createInitialCardFromFormSchema({ formSchema: inputSchema }),
    })) as TDefaultCard[];

    fresh.forEach((card) => {
      card.isOffline = false;
    });

    setData(fresh);
    setGlobalData(
      v2_createInitialGlobalDataFromFormSchema({ formSchema: inputSchema })
    );
  }, [inputSchema]);

  const resetGlobalData = useCallback(() => {
    setGlobalData(
      v2_createInitialGlobalDataFromFormSchema({ formSchema: inputSchema })
    );
  }, [inputSchema]);

  const resetCard = useCallback(
    (dayIndex: number) => {
      if (dayIndex >= 0 && dayIndex < v2_WEEK.length) {
        const freshCard = {
          day: v2_WEEK[dayIndex],
          ...v2_createInitialCardFromFormSchema({ formSchema: inputSchema }),
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
