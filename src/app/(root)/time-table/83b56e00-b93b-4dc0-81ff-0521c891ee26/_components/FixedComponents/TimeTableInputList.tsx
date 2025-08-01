import TimeRenderer from "@/components/TimeTable/fieldRenderer/TimeRenderer";
import TopicRenderer from "@/components/TimeTable/fieldRenderer/TopicRenderer";
import React from "react";
import {
  getCardInputConfig,
  placeholders,
  SimpleFieldConfig,
  TDefaultCard,
  weekdays,
} from "../../_settings/general";
import { weekdayOption } from "../../_settings/settings";

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

// 시간 파싱 유틸리티 함수
const parseTimeString = (
  timeString: string
): { hour: number; minute: number } => {
  if (!timeString || timeString === "") {
    return { hour: 0, minute: 0 };
  }

  const [hourStr, minuteStr] = timeString.split(":");
  const hour = parseInt(hourStr) || 0;
  const minute = parseInt(minuteStr) || 0;

  return {
    hour: Math.max(0, Math.min(24, hour)),
    minute: Math.max(0, Math.min(60, Math.floor(minute / 5) * 5)),
  };
};

// 시간 포맷팅 유틸리티 함수
const formatTimeString = (hour: number, minute: number): string => {
  const validHour = Math.max(0, Math.min(24, hour));
  const validMinute = Math.max(0, Math.min(60, Math.floor(minute / 5) * 5));

  return `${validHour.toString().padStart(2, "0")}:${validMinute
    .toString()
    .padStart(2, "0")}`;
};

// 기본 필드 렌더러들
export const defaultFieldRenderers = {
  time: ({ day, index, onChange }: Parameters<FieldRenderer>[0]) => {
    const { hour, minute } = parseTimeString(day.time as string);

    const handleHourChange = (newHour: number) => {
      const formattedTime = formatTimeString(newHour, minute);
      onChange(index, "time", formattedTime);
    };

    const handleMinuteChange = (newMinute: number) => {
      const formattedTime = formatTimeString(hour, newMinute);
      onChange(index, "time", formattedTime);
    };

    return (
      <TimeRenderer
        handleHourChange={handleHourChange}
        handleMinuteChange={handleMinuteChange}
        hour={hour}
        minute={minute}
      />
    );
  },

  topic: ({ day, index, onChange }: Parameters<FieldRenderer>[0]) => {
    const handleTopicChange = (value: string) => {
      onChange(index, "topic", value);
    };
    return (
      <TopicRenderer
        handleTopicChange={handleTopicChange}
        placeholder={placeholders.topic}
        value={day.topic as string}
      />
    );
  },

  description: ({ day, index, onChange }: Parameters<FieldRenderer>[0]) => {
    return (
      <textarea
        value={day.description as string}
        placeholder={placeholders.description}
        className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none resize-none"
        onChange={(e) => onChange(index, "description", e.target.value)}
      />
    );
  },
};

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
    index: number
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
            type="text"
            value={value}
            placeholder={fieldConfig.placeholder}
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
            className={commonClassName}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                e.target.value
              )
            }
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            placeholder={fieldConfig.placeholder}
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
            rows={3}
            className={`${commonClassName} resize-none`}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                e.target.value
              )
            }
          />
        );

      case "time":
        const { hour, minute } = parseTimeString(value);

        const handleHourChange = (newHour: number) => {
          const formattedTime = formatTimeString(newHour, minute);
          handleFieldChange(
            index,
            fieldConfig.key as keyof TDefaultCard,
            formattedTime
          );
        };

        const handleMinuteChange = (newMinute: number) => {
          const formattedTime = formatTimeString(hour, newMinute);
          handleFieldChange(
            index,
            fieldConfig.key as keyof TDefaultCard,
            formattedTime
          );
        };

        return (
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="24"
                value={hour}
                required={fieldConfig.required}
                className={`${commonClassName} text-center`}
                placeholder="시"
                onChange={(e) =>
                  handleHourChange(parseInt(e.target.value) || 0)
                }
              />
            </div>
            <span className="text-gray-500 font-semibold">:</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="60"
                step="5"
                value={minute}
                required={fieldConfig.required}
                className={`${commonClassName} text-center`}
                placeholder="분"
                onChange={(e) =>
                  handleMinuteChange(parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>
        );

      case "select":
        return (
          <select
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
            type="number"
            value={value}
            placeholder={fieldConfig.placeholder}
            required={fieldConfig.required}
            className={commonClassName}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                parseInt(e.target.value) || 0
              )
            }
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            placeholder={fieldConfig.placeholder}
            className={commonClassName}
            onChange={(e) =>
              handleFieldChange(
                index,
                fieldConfig.key as keyof TDefaultCard,
                e.target.value
              )
            }
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
  const renderDefaultField = (
    fieldKey: string,
    day: TDefaultCard,
    index: number
  ) => {
    const renderer =
      defaultFieldRenderers[fieldKey as keyof typeof defaultFieldRenderers];
    return renderer
      ? renderer({ day, index, onChange: handleFieldChange })
      : null;
  };

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
                const isDefaultField = fieldConfig.key in defaultFieldRenderers;

                return (
                  <div key={fieldConfig.key}>
                    {fieldConfig.label && cardConfig.showLabels && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {fieldConfig.label}
                      </label>
                    )}
                    {isDefaultField
                      ? renderDefaultField(fieldConfig.key, day, index)
                      : renderInputField(fieldConfig, day, index)}
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
