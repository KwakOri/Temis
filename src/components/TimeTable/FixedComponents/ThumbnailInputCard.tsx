import AdaptiveTimeRenderer from "@/components/TimeTable/fieldRenderer/AdaptiveTimeRenderer";
import DateRenderer from "@/components/TimeTable/fieldRenderer/DateRenderer";
import TextareaRenderer from "@/components/TimeTable/fieldRenderer/TextareaRenderer";
import TextRenderer from "@/components/TimeTable/fieldRenderer/TextRenderer";
import {
  CardInputConfig,
  SimpleFieldConfig,
  TDynamicCard,
  TEntry,
  TPlaceholders,
} from "@/types/time-table/data";
import React from "react";

export interface ThumbnailInputCardProps {
  data: TDynamicCard;
  onDataChange: (newData: TDynamicCard) => void;

  // UI 커스터마이징
  containerClassName?: string;
  itemClassName?: string;
  fieldsContainerClassName?: string;

  cardInputConfig: CardInputConfig;
  placeholders: TPlaceholders;
}

const ThumbnailInputCard: React.FC<ThumbnailInputCardProps> = ({
  data,
  onDataChange,
  containerClassName = "flex flex-col gap-4 w-full select-none",
  itemClassName = "bg-white backdrop-blur-md rounded-xl p-4 shadow-[0_4px_5px_rgba(0,0,0,0.15)]",
  fieldsContainerClassName = "pt-2 flex flex-col gap-4",
  cardInputConfig,
  placeholders,
}) => {
  // TDynamicCard의 첫 번째 entry를 편집용 데이터로 사용
  // entries가 없으면 기본 entry 생성
  const currentEntry: TEntry = data.entries?.[0] || {
    time: "",
    mainTitle: "",
    isGuerrilla: false,
  };

  // 오프라인 토글 설정 (기본값 지정)
  const offlineToggleConfig = cardInputConfig.offlineToggle || {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  };

  // 필드 렌더링 함수
  const renderInputField = (fieldConfig: SimpleFieldConfig) => {
    const value = String(
      currentEntry[fieldConfig.key] || fieldConfig.defaultValue || ""
    );

    const commonClassName =
      "w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none";

    switch (fieldConfig.type) {
      case "text":
        return (
          <TextRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTextChange={(newValue) =>
              handleFieldChange(fieldConfig.key, newValue)
            }
            height="sm"
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
          />
        );

      case "textarea":
        return (
          <TextareaRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTextareaChange={(newValue) =>
              handleFieldChange(fieldConfig.key, newValue)
            }
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
            rows={3}
          />
        );

      case "time":
        const fieldId = `${fieldConfig.key}-thumbnail`;
        return (
          <AdaptiveTimeRenderer
            id={fieldId}
            value={value}
            onChange={(newValue) =>
              handleFieldChange(fieldConfig.key, newValue)
            }
            height="sm"
          />
        );

      case "date":
        const dateFieldId = `${fieldConfig.key}-date-thumbnail`;
        return (
          <DateRenderer
            id={dateFieldId}
            value={value}
            onChange={(newValue) =>
              handleFieldChange(fieldConfig.key, newValue)
            }
            placeholder={fieldConfig.placeholder}
          />
        );

      case "select":
        return (
          <select
            value={value}
            required={fieldConfig.required}
            className={`${commonClassName} appearance-none cursor-pointer`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: "right 0.75rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.5em 1.5em",
              paddingRight: "2.5rem",
            }}
            onChange={(e) => handleFieldChange(fieldConfig.key, e.target.value)}
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
          <TextRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTextChange={(newValue) =>
              handleFieldChange(
                fieldConfig.key,
                isNaN(parseInt(newValue)) ? 0 : parseInt(newValue)
              )
            }
            height="sm"
            type="number"
            required={fieldConfig.required}
          />
        );

      default:
        return (
          <TextRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTextChange={(newValue) =>
              handleFieldChange(fieldConfig.key, newValue)
            }
            height="sm"
            required={fieldConfig.required}
          />
        );
    }
  };

  // 필드 변경 핸들러 - entry 내부 필드 업데이트
  const handleFieldChange = (
    field: string,
    value: string | number | boolean
  ) => {
    const updatedEntry = { ...currentEntry, [field]: value };
    const newData = {
      ...data,
      entries: [updatedEntry],
    };
    onDataChange(newData);
  };

  // 오프라인 토글 핸들러
  const handleOfflineToggle = () => {
    const newData = { ...data, isOffline: !data.isOffline };
    onDataChange(newData);
  };

  return (
    <div className={containerClassName}>
      <div className={itemClassName}>
        {/* 헤더 - 타이틀과 오프라인 토글 */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">썸네일 정보</span>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {offlineToggleConfig.label}
            </span>
            <button
              type="button"
              className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                data.isOffline
                  ? offlineToggleConfig.activeColor
                  : offlineToggleConfig.inactiveColor
              }`}
              onClick={handleOfflineToggle}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
                  data.isOffline ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 확장 가능한 입력 필드들 */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            data.isOffline ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
          }`}
        >
          <div className={fieldsContainerClassName}>
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-200">
              {/* 각 필드들 */}
              <div className="space-y-3">
                {cardInputConfig.fields.map((fieldConfig) => (
                  <div key={fieldConfig.key}>
                    {fieldConfig.label && cardInputConfig.showLabels && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {fieldConfig.label}
                      </label>
                    )}
                    {renderInputField(fieldConfig)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailInputCard;
