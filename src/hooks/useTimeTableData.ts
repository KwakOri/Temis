import { CardInputConfig, TDefaultCard } from "@/types/time-table/data";
import {
  createInitialCardFromConfig,
  createInitialEntryFromConfig,
  getDefaultCards,
  week,
} from "@/utils/time-table/data";
import { useCallback, useState } from "react";

/**
 * 타임테이블 데이터 상태 관리 훅
 * CardInputConfig를 받아서 동적으로 초기 카드를 생성
 */
export const useTimeTableData = ({
  cardInputConfig,
}: {
  cardInputConfig: CardInputConfig;
}) => {
  // CardInputConfig를 기반으로 초기 데이터 생성
  const [data, setData] = useState<TDefaultCard[]>(() => {
    return getDefaultCards({ cardInputConfig });
  });

  // 데이터 업데이트 함수
  const updateData = useCallback((newData: TDefaultCard[]) => {
    setData(newData);
  }, []);

  // 개별 카드 업데이트 함수
  const updateCard = useCallback(
    (dayIndex: number, cardData: Partial<TDefaultCard>) => {
      setData((prevData) => {
        const newData = [...prevData];
        if (dayIndex >= 0 && dayIndex < newData.length) {
          newData[dayIndex] = { ...newData[dayIndex], ...cardData };
        }
        return newData;
      });
    },
    []
  );

  // 특정 필드 업데이트 함수 (오프라인 메모 등)
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

  // 엔트리 필드 업데이트 함수
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
        const newData = [...prevData];
        if (dayIndex >= 0 && dayIndex < newData.length) {
          const newEntries = [...newData[dayIndex].entries];
          if (entryIndex >= 0 && entryIndex < newEntries.length) {
            newEntries[entryIndex] = {
              ...newEntries[entryIndex],
              [fieldKey]: value,
            };
            newData[dayIndex] = { ...newData[dayIndex], entries: newEntries };
          }
        }
        return newData;
      });
    },
    []
  );

  // 엔트리 추가 함수
  const addEntry = useCallback(
    (dayIndex: number) => {
      setData((prevData) => {
        const newData = [...prevData];
        if (dayIndex >= 0 && dayIndex < newData.length) {
          const newEntry = createInitialEntryFromConfig({ cardInputConfig });
          newData[dayIndex] = {
            ...newData[dayIndex],
            entries: [...newData[dayIndex].entries, newEntry],
          };
        }
        return newData;
      });
    },
    [cardInputConfig]
  );

  // 엔트리 제거 함수
  const removeEntry = useCallback(
    (dayIndex: number, entryIndex: number) => {
      setData((prevData) => {
        const newData = [...prevData];
        if (dayIndex >= 0 && dayIndex < newData.length) {
          const newEntries = newData[dayIndex].entries.filter(
            (_, index) => index !== entryIndex
          );
          // 최소 하나의 엔트리는 유지
          if (newEntries.length === 0) {
            newEntries.push(createInitialEntryFromConfig({ cardInputConfig }));
          }
          newData[dayIndex] = { ...newData[dayIndex], entries: newEntries };
        }
        return newData;
      });
    },
    [cardInputConfig]
  );

  // 오프라인 토글 함수
  const toggleOffline = useCallback((dayIndex: number) => {
    setData((prevData) => {
      const newData = [...prevData];
      if (dayIndex >= 0 && dayIndex < newData.length) {
        newData[dayIndex] = {
          ...newData[dayIndex],
          isOffline: !newData[dayIndex].isOffline,
        };
      }
      return newData;
    });
  }, []);

  // 모든 카드를 기본값으로 리셋 (CardInputConfig 기반)
  const resetData = useCallback(() => {
    const freshDefaultCards = week.map((day) => ({
      day,
      ...createInitialCardFromConfig({ cardInputConfig }),
    })) as TDefaultCard[];

    // isOffline 강제로 false로 설정
    freshDefaultCards.forEach((card) => {
      card.isOffline = false;
    });

    setData(freshDefaultCards);
  }, [cardInputConfig]);

  // 특정 요일의 카드를 기본값으로 리셋 (CardInputConfig 기반)
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
    // 상태
    data,

    // 업데이트 함수들
    updateData,
    updateCard,
    updateCardField,
    updateEntryField,
    toggleOffline,

    // 엔트리 관리 함수들
    addEntry,
    removeEntry,

    // 리셋 함수들
    resetData,
    resetCard,
  };
};
