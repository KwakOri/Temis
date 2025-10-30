import { CardInputConfig, TDynamicCard } from "@/types/time-table/data";
import {
  createInitialCardFromConfig,
  createInitialEntryFromConfig,
} from "@/utils/time-table/data";
import { useCallback, useState } from "react";

/**
 * 썸네일 데이터 상태 관리 훅
 * CardInputConfig를 받아서 단일 카드를 동적으로 생성 및 관리
 * useTimeTableData와 달리 일주일치가 아닌 하나의 카드만 관리
 */
export const useThumbnailData = ({
  cardInputConfig,
}: {
  cardInputConfig: CardInputConfig;
}) => {
  // CardInputConfig를 기반으로 단일 카드 생성
  const [data, setData] = useState<TDynamicCard>(() => {
    return createInitialCardFromConfig({ cardInputConfig });
  });

  // 카드 전체 업데이트 함수
  const updateCard = useCallback((cardData: Partial<TDynamicCard>) => {
    setData((prevData) => ({ ...prevData, ...cardData }));
  }, []);

  // 특정 필드 업데이트 함수 (오프라인 메모 등)
  const updateCardField = useCallback(
    (
      fieldKey: keyof TDynamicCard,
      value:
        | string
        | number
        | boolean
        | Array<{ text: string; checked: boolean }>
        | undefined
    ) => {
      updateCard({ [fieldKey]: value } as Partial<TDynamicCard>);
    },
    [updateCard]
  );

  // 엔트리 필드 업데이트 함수
  const updateEntryField = useCallback(
    (
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
        const newEntries = [...prevData.entries];
        if (entryIndex >= 0 && entryIndex < newEntries.length) {
          newEntries[entryIndex] = {
            ...newEntries[entryIndex],
            [fieldKey]: value,
          };
          return { ...prevData, entries: newEntries };
        }
        return prevData;
      });
    },
    []
  );

  // 엔트리 추가 함수
  const addEntry = useCallback(() => {
    setData((prevData) => {
      const newEntry = createInitialEntryFromConfig({ cardInputConfig });
      return {
        ...prevData,
        entries: [...prevData.entries, newEntry],
      };
    });
  }, [cardInputConfig]);

  // 엔트리 제거 함수
  const removeEntry = useCallback(
    (entryIndex: number) => {
      setData((prevData) => {
        const newEntries = prevData.entries.filter(
          (_, index) => index !== entryIndex
        );
        // 최소 하나의 엔트리는 유지
        if (newEntries.length === 0) {
          newEntries.push(createInitialEntryFromConfig({ cardInputConfig }));
        }
        return { ...prevData, entries: newEntries };
      });
    },
    [cardInputConfig]
  );

  // 오프라인 토글 함수
  const toggleOffline = useCallback(() => {
    setData((prevData) => ({
      ...prevData,
      isOffline: !prevData.isOffline,
    }));
  }, []);

  // 카드를 기본값으로 리셋 (CardInputConfig 기반)
  const resetData = useCallback(() => {
    const freshCard = createInitialCardFromConfig({ cardInputConfig });
    // isOffline 강제로 false로 설정
    freshCard.isOffline = false;
    setData(freshCard);
  }, [cardInputConfig]);

  return {
    // 상태
    data,

    // 업데이트 함수들
    updateCard,
    updateCardField,
    updateEntryField,
    toggleOffline,

    // 엔트리 관리 함수들
    addEntry,
    removeEntry,

    // 리셋 함수
    resetData,
  };
};
