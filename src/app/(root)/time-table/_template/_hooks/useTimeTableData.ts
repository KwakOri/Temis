import { useCallback, useState } from "react";
import { TDefaultCard, defaultCards } from "../_settings/general";
import { useFormPersistence } from "../_utils/formPersistence";

/**
 * 타임테이블 데이터 상태 관리 훅
 */
export const useTimeTableData = () => {
  const { loadPersistedData } = useFormPersistence();

  // localStorage에서 저장된 데이터 로드하여 초기값 설정
  const [data, setData] = useState<TDefaultCard[]>(() => {
    const persistedData = loadPersistedData();
    return persistedData.data.length > 0 ? persistedData.data : defaultCards;
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

  // 특정 필드 업데이트 함수
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

  // 모든 카드를 기본값으로 리셋
  const resetData = useCallback(() => {
    setData(defaultCards);
  }, []);

  // 특정 요일의 카드를 기본값으로 리셋
  const resetCard = useCallback(
    (dayIndex: number) => {
      if (dayIndex >= 0 && dayIndex < defaultCards.length) {
        updateCard(dayIndex, defaultCards[dayIndex]);
      }
    },
    [updateCard]
  );

  return {
    // 상태
    data,

    // 업데이트 함수들
    updateData,
    updateCard,
    updateCardField,
    toggleOffline,

    // 리셋 함수들
    resetData,
    resetCard,
  };
};
