import { AddonFieldConfig, TAddonData } from "@/components/TimeTable/FixedComponents/TimeTableAddonList";
import { useCallback, useMemo, useState } from "react";

/**
 * 주간 단위 addon 데이터를 생성하는 헬퍼 함수
 */
const createInitialAddonData = (fields: AddonFieldConfig[]): TAddonData => {
  const initialData: TAddonData = {};

  fields.forEach((field) => {
    initialData[field.key] = field.defaultValue ?? "";
  });

  return initialData;
};

/**
 * 타임테이블 addon 데이터 상태 관리 훅
 * AddonFieldConfig 배열을 받아서 주간 단위 데이터 관리
 */
export const useTimeTableAddon = ({
  fields,
}: {
  fields: AddonFieldConfig[];
}) => {
  // 초기 데이터 생성 (메모이제이션)
  const initialData = useMemo(
    () => createInitialAddonData(fields),
    [fields]
  );

  // 데이터 상태 관리
  const [data, setData] = useState<TAddonData>(initialData);

  // 전체 데이터 업데이트 함수
  const updateData = useCallback((newData: TAddonData) => {
    setData(newData);
  }, []);

  // 개별 필드 업데이트 함수
  const updateField = useCallback(
    (fieldKey: string, value: string | number | boolean) => {
      setData((prevData) => ({
        ...prevData,
        [fieldKey]: value,
      }));
    },
    []
  );

  // 여러 필드를 한번에 업데이트하는 함수
  const updateFields = useCallback(
    (updates: Partial<TAddonData>) => {
      setData((prevData) => ({
        ...prevData,
        ...updates,
      } as TAddonData));
    },
    []
  );

  // 데이터를 기본값으로 리셋하는 함수
  const resetData = useCallback(() => {
    setData(createInitialAddonData(fields));
  }, [fields]);

  // 특정 필드를 기본값으로 리셋하는 함수
  const resetField = useCallback(
    (fieldKey: string) => {
      const field = fields.find((f) => f.key === fieldKey);
      if (field) {
        updateField(fieldKey, field.defaultValue ?? "");
      }
    },
    [fields, updateField]
  );

  return {
    // 상태
    data,

    // 업데이트 함수들
    updateData,
    updateField,
    updateFields,

    // 리셋 함수들
    resetData,
    resetField,
  };
};
