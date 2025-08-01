import React from "react";
import { TDefaultCard, weekdays } from "../../_settings/general";
import {
  getCardInputConfig,
  SimpleFieldConfig,
  weekdayOption,
} from "../../_settings/settings";
import AdaptiveTimeRenderer from "@/components/TimeTable/fieldRenderer/AdaptiveTimeRenderer";

// 개별 필드 렌더러 타입 정의
export interface FieldRenderer {
  (props: {
    day: TDefaultCard;
    index: number;
    onChange: (
      index: number,
      field: keyof TDefaultCard,
      value:
        | string
        | number
        | boolean
        | Array<{ text: string; checked: boolean }>
    ) => void;
  }): React.ReactNode;
}

// 기본 필드 렌더러들
// export const defaultFieldRenderers = {
//   time: ({ day, index, onChange }: Parameters<FieldRenderer>[0]) => {
//     return (
//       <input
//         type="time"
//         value={day.time as string}
//         className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none"
//         onChange={(e) => onChange(index, "time", e.target.value)}
//       />
//     );
//   },

//   topic: ({ day, index, onChange }: Parameters<FieldRenderer>[0]) => (
//     <input
//       value={day.topic as string}
//       placeholder={placeholders.topic}
//       className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none"
//       onChange={(e) => onChange(index, "topic", e.target.value)}
//     />
//   ),

//   description: ({ day, index, onChange }: Parameters<FieldRenderer>[0]) => (
//     <textarea
//       value={day.description as string}
//       placeholder={placeholders.description}
//       className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none resize-none"
//       onChange={(e) => onChange(index, "description", e.target.value)}
//     />
//   ),
// };

// 커스텀 필드 렌더러 타입
export interface CustomFieldRenderer {
  key: string;
  label?: string;
  renderer: FieldRenderer;
}

export interface TimeTableInputListProps {
  data: TDefaultCard[];
  onDataChange: (newData: TDefaultCard[]) => void;

  // UI 커스터마이징
  containerClassName?: string;
  itemClassName?: string;
  headerClassName?: string;
  fieldsContainerClassName?: string;

  // 요일 표시 커스터마이징
  weekdayRenderer?: (day: TDefaultCard) => React.ReactNode;

  // 애니메이션 설정
  expandAnimation?: {
    duration?: number;
    maxHeight?: string;
  };
}

const TimeTableInputList: React.FC<TimeTableInputListProps> = ({
  data,
  onDataChange,
  containerClassName = "flex flex-col gap-4 w-full select-none",
  itemClassName = "bg-white backdrop-blur-md rounded-xl p-4 shadow-[0_4px_5px_rgba(0,0,0,0.15)]",
  headerClassName = "flex justify-between items-center",
  fieldsContainerClassName = "pt-2 flex flex-col gap-4",
  weekdayRenderer,
  expandAnimation = {
    duration: 300,
    maxHeight: "500px",
  },
}) => {
  // settings.ts에서 필드 구성 가져오기
  const cardConfig = getCardInputConfig();

  // 오프라인 토글 설정 (기본값 지정)
  const offlineToggleConfig = cardConfig.offlineToggle || {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  };

  // 필드 렌더링 함수
  const renderInputField = (
    fieldConfig: SimpleFieldConfig,
    day: TDefaultCard,
    index: number,
    fieldId: string
  ) => {
    const extendedDay = day as TDefaultCard;
    const value = String(
      extendedDay[fieldConfig.key] || fieldConfig.defaultValue || ""
    );

    const commonClassName =
      "w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none";

    switch (fieldConfig.type) {
      case "text":
        return (
          <input
            id={fieldId}
            type="text"
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                e.target.value
              )
            }
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
            className={commonClassName}
          />
        );

      case "textarea":
        return (
          <textarea
            id={fieldId}
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                e.target.value
              )
            }
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
            rows={3}
            className={commonClassName}
          />
        );

      case "time":
        return (
          <AdaptiveTimeRenderer
            id={fieldId}
            value={value}
            onChange={(newValue) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                newValue
              )
            }
          />
        );

      case "select":
        return (
          <select
            id={fieldId}
            value={value}
            required={fieldConfig.required}
            className={commonClassName}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                e.target.value
              )
            }
          >
            <option value="" disabled>
              {fieldConfig.placeholder}
            </option>
            {fieldConfig.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "number":
        return (
          <input
            id={fieldId}
            type="number"
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value)
              )
            }
            required={fieldConfig.required}
            className={commonClassName}
          />
        );

      default:
        return (
          <input
            id={fieldId}
            type="text"
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                e.target.value
              )
            }
            required={fieldConfig.required}
            className={commonClassName}
          />
        );
    }
  };

  // 데이터 변경 핸들러
  const handleFieldChange = (
    index: number,
    field: keyof TDefaultCard,
    value: string | number | boolean | Array<{ text: string; checked: boolean }>
  ) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value } as TDefaultCard;
    onDataChange(newData);
  };

  // 오프라인 토글 핸들러
  const handleOfflineToggle = (index: number) => {
    const newData = [...data];
    newData[index].isOffline = !newData[index].isOffline;
    onDataChange(newData);
  };

  // 기본 요일 렌더러
  const defaultWeekdayRenderer = (day: TDefaultCard) => (
    <span className="font-semibold text-gray-700">
      {weekdays[weekdayOption][day.day]}
    </span>
  );

  // 기본 필드 렌더링 (기존 호환성 유지)
  // const renderDefaultField = (
  //   fieldKey: string,
  //   day: TDefaultCard,
  //   index: number
  // ) => {
  //   const renderer =
  //     defaultFieldRenderers[fieldKey as keyof typeof defaultFieldRenderers];
  //   return renderer
  //     ? renderer({ day, index, onChange: handleFieldChange })
  //     : null;
  // };

  return (
    <div className={containerClassName}>
      {data.map((day, index) => (
        <div key={day.day} className={itemClassName}>
          {/* 헤더 - 요일과 오프라인 토글 */}
          <div className={headerClassName}>
            {weekdayRenderer
              ? weekdayRenderer(day)
              : defaultWeekdayRenderer(day)}

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {offlineToggleConfig.label}
              </span>
              <button
                type="button"
                className={`w-10 h-5 flex items-center rounded-full p-1 duration-${
                  expandAnimation.duration
                } ease-in-out ${
                  day.isOffline
                    ? offlineToggleConfig.activeColor
                    : offlineToggleConfig.inactiveColor
                }`}
                onClick={() => handleOfflineToggle(index)}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-${
                    expandAnimation.duration
                  } ease-in-out ${
                    day.isOffline ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 확장 가능한 입력 필드들 */}
          <div
            className={`transition-all duration-${
              expandAnimation.duration
            } overflow-hidden ${
              day.isOffline
                ? "max-h-0 opacity-0"
                : `max-h-[${expandAnimation.maxHeight}] opacity-100`
            }`}
          >
            <div className={fieldsContainerClassName}>
              {cardConfig.fields.map((fieldConfig) => {
                // 기본 필드인지 확인
                // const isDefaultField = fieldConfig.key in defaultFieldRenderers;
                const fieldId = `${fieldConfig.key}-${day.day}-${index}`;

                return (
                  <div key={fieldConfig.key}>
                    {fieldConfig.label && cardConfig.showLabels && (
                      <label
                        htmlFor={fieldId}
                        className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer"
                      >
                        {fieldConfig.label}
                      </label>
                    )}
                    {renderInputField(fieldConfig, day, index, fieldId)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimeTableInputList;
