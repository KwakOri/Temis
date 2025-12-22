import AdaptiveTimeRenderer from "@/components/TimeTable/fieldRenderer/AdaptiveTimeRenderer";
import TextareaRenderer from "@/components/TimeTable/fieldRenderer/TextareaRenderer";
import TextRenderer from "@/components/TimeTable/fieldRenderer/TextRenderer";
import { SizeProps } from "@/utils/utils";
import React from "react";

// Addon 데이터 타입 정의
export type TAddonData = Record<string, string | number | boolean>;

// Addon 필드 설정 타입
export interface AddonFieldConfig {
  key: string;
  type: "text" | "textarea" | "time" | "number" | "select";
  placeholder?: string;
  label?: string;
  required?: boolean;
  defaultValue?: string | number;
  maxLength?: number;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface TimeTableAddonListProps {
  data: TAddonData;
  onDataChange: (newData: TAddonData) => void;
  fields: AddonFieldConfig[];

  // UI 커스터마이징
  containerClassName?: string;
  itemClassName?: string;
  fieldsContainerClassName?: string;

  // 레이블 표시 여부
  showLabels?: boolean;

  // 필드 높이
  height?: SizeProps;
}

const TimeTableAddonList: React.FC<TimeTableAddonListProps> = ({
  data,
  onDataChange,
  fields,
  containerClassName = "flex flex-col gap-4 w-full select-none",
  itemClassName = "bg-white backdrop-blur-md rounded-xl p-4 shadow-[0_4px_5px_rgba(0,0,0,0.15)]",
  fieldsContainerClassName = "flex flex-col gap-4",
  showLabels = false,
  height = "md",
}) => {
  // 필드 값 변경 핸들러
  const handleFieldChange = (
    field: string,
    value: string | number | boolean
  ) => {
    const newData = { ...data, [field]: value };
    onDataChange(newData);
  };

  // 필드 렌더링 함수
  const renderInputField = (fieldConfig: AddonFieldConfig) => {
    const value = String(
      data[fieldConfig.key] || fieldConfig.defaultValue || ""
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
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
            height={height}
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
            rows={fieldConfig.rows || 3}
          />
        );

      case "time":
        const fieldId = `addon-${fieldConfig.key}`;
        return (
          <AdaptiveTimeRenderer
            id={fieldId}
            value={value}
            onChange={(newValue) =>
              handleFieldChange(fieldConfig.key, newValue)
            }
            height={height}
          />
        );

      case "select":
        return (
          <select
            value={value}
            required={fieldConfig.required}
            className={commonClassName}
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
            type="number"
            required={fieldConfig.required}
            height={height}
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
            required={fieldConfig.required}
            height={height}
          />
        );
    }
  };

  return (
    <div className={containerClassName}>
      <div className={itemClassName}>
        <div className={fieldsContainerClassName}>
          {fields.map((fieldConfig) => (
            <div key={fieldConfig.key}>
              {fieldConfig.label && showLabels && (
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
  );
};

export default TimeTableAddonList;
