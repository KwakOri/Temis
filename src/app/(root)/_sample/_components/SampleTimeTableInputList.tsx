import AdaptiveTimeRenderer from "@/components/TimeTable/fieldRenderer/AdaptiveTimeRenderer";
import TextareaRenderer from "@/components/TimeTable/fieldRenderer/TextareaRenderer";
import TextRenderer from "@/components/TimeTable/fieldRenderer/TextRenderer";
import { cn } from "@/lib/utils";
import {
  CardInputConfig,
  SimpleFieldConfig,
  TDefaultCard,
  TEntry,
  TLanOpt,
  TPlaceholders,
} from "@/types/time-table/data";
import {
  createInitialEntryFromConfig,
  weekdays,
} from "@/utils/time-table/data";
import React from "react";
import { EntryCard } from "../../../../components/TimeTable/FixedComponents/EntryCard";
import {
  buttonVariants,
  inputVariants,
  labelVariants,
} from "../../../../components/TimeTable/FixedComponents/styles";
import { Toggle } from "../../../../components/TimeTable/FixedComponents/Toggle";
import { SampleDayCard } from "./SampleDayCard";

// 개별 필드 렌더러 타입 정의 (다중 엔트리 지원)
export interface FieldRenderer {
  (props: {
    entry: TEntry;
    dayIndex: number;
    entryIndex: number;
    onChange: (
      dayIndex: number,
      entryIndex: number,
      field: string,
      value:
        | string
        | number
        | boolean
        | Array<{ text: string; checked: boolean }>
    ) => void;
  }): React.ReactNode;
}

// 기본 필드 렌더러들 - 동적 속성 지원 개선

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

  weekdayOption: TLanOpt;
  cardInputConfig: CardInputConfig;
  placeholders: TPlaceholders;
  isOfflineMemo?: boolean;

  // 다중 엔트리 설정
  isMultiple?: boolean;
  maxStreamingTimeByDay?: number;
}

const TimeTableSampleInputList: React.FC<TimeTableInputListProps> = ({
  data,
  onDataChange,
  containerClassName = "flex flex-col gap-4 w-full select-none",
  itemClassName = "bg-white backdrop-blur-md rounded-xl p-4 shadow-[0_4px_5px_rgba(0,0,0,0.15)]",
  headerClassName = "flex justify-between items-center",
  fieldsContainerClassName = "pt-2 flex flex-col gap-4",
  weekdayRenderer,
  weekdayOption,
  expandAnimation = {
    duration: 300,
    maxHeight: "500px",
  },
  cardInputConfig,
  placeholders,
  isOfflineMemo = false,
  isMultiple = false,
  maxStreamingTimeByDay = 1,
}) => {
  const defaultFieldRenderers = {
    time: ({
      entry,
      dayIndex,
      entryIndex,
      onChange,
    }: Parameters<FieldRenderer>[0]) => {
      const fieldId = `time-${dayIndex}-${entryIndex}`;
      return (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <AdaptiveTimeRenderer
              id={fieldId}
              value={entry.time as string}
              onChange={(newValue) =>
                onChange(dayIndex, entryIndex, "time", newValue)
              }
              disabled={entry.isGuerrilla}
            />
          </div>
          <Toggle
            active={entry.isGuerrilla || false}
            onToggle={() =>
              onChange(dayIndex, entryIndex, "isGuerrilla", !entry.isGuerrilla)
            }
            label="게릴라"
            variant="guerrilla"
            size="sm"
            ariaLabel="게릴라방송 토글"
            title={entry.isGuerrilla ? "게릴라방송 ON" : "게릴라방송 OFF"}
          />
        </div>
      );
    },

    topic: ({
      entry,
      dayIndex,
      entryIndex,
      onChange,
    }: Parameters<FieldRenderer>[0]) => {
      const handleTopicChange = (value: string) => {
        onChange(dayIndex, entryIndex, "topic", value);
      };
      return (
        <TextRenderer
          value={entry.topic as string}
          placeholder={placeholders.topic}
          handleTextChange={handleTopicChange}
          maxLength={50}
          autoComplete="off"
          aria-label="주제 입력"
        />
      );
    },

    description: ({
      entry,
      dayIndex,
      entryIndex,
      onChange,
    }: Parameters<FieldRenderer>[0]) => {
      const handleDescriptionChange = (value: string) => {
        onChange(dayIndex, entryIndex, "description", value);
      };
      return (
        <TextareaRenderer
          value={entry.description as string}
          placeholder={placeholders.description}
          handleTextareaChange={handleDescriptionChange}
          maxLength={200}
          rows={3}
          spellCheck={true}
          aria-label="설명 입력"
        />
      );
    },
  };
  // settings.ts에서 필드 구성 가져오기

  // 오프라인 토글 설정 (기본값 지정)
  const offlineToggleConfig = cardInputConfig.offlineToggle || {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  };

  // 필드 렌더링 함수 (다중 엔트리 지원)
  const renderInputField = (
    fieldConfig: SimpleFieldConfig,
    entry: TEntry,
    dayIndex: number,
    entryIndex: number
  ) => {
    const value = String(
      entry[fieldConfig.key] || fieldConfig.defaultValue || ""
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
              handleEntryFieldChange(
                dayIndex,
                entryIndex,
                fieldConfig.key,
                newValue
              )
            }
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
              handleEntryFieldChange(
                dayIndex,
                entryIndex,
                fieldConfig.key,
                newValue
              )
            }
            maxLength={fieldConfig.maxLength}
            required={fieldConfig.required}
            rows={3}
          />
        );

      case "time":
        const fieldId = `${fieldConfig.key}-${dayIndex}-${entryIndex}`;
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <AdaptiveTimeRenderer
                id={fieldId}
                value={value}
                onChange={(newValue) =>
                  handleEntryFieldChange(
                    dayIndex,
                    entryIndex,
                    fieldConfig.key,
                    newValue
                  )
                }
                disabled={entry.isGuerrilla}
              />
            </div>
            <Toggle
              active={entry.isGuerrilla || false}
              onToggle={() =>
                handleEntryFieldChange(
                  dayIndex,
                  entryIndex,
                  "isGuerrilla",
                  !entry.isGuerrilla
                )
              }
              label="게릴라"
              variant="guerrilla"
              size="sm"
              ariaLabel="게릴라방송 토글"
              title={entry.isGuerrilla ? "게릴라방송 ON" : "게릴라방송 OFF"}
            />
          </div>
        );

      case "select":
        return (
          <select
            value={value}
            required={fieldConfig.required}
            className={commonClassName}
            onChange={(e) =>
              handleEntryFieldChange(
                dayIndex,
                entryIndex,
                fieldConfig.key,
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
          <TextRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTextChange={(newValue) =>
              handleEntryFieldChange(
                dayIndex,
                entryIndex,
                fieldConfig.key,
                isNaN(parseInt(newValue)) ? 0 : parseInt(newValue)
              )
            }
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
              handleEntryFieldChange(
                dayIndex,
                entryIndex,
                fieldConfig.key,
                newValue
              )
            }
            required={fieldConfig.required}
          />
        );
    }
  };

  // 엔트리 필드 변경 핸들러
  const handleEntryFieldChange = (
    dayIndex: number,
    entryIndex: number,
    field: string,
    value: string | number | boolean | Array<{ text: string; checked: boolean }>
  ) => {
    const newData = [...data];
    const newEntries = [...newData[dayIndex].entries];
    newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value };
    newData[dayIndex] = { ...newData[dayIndex], entries: newEntries };
    onDataChange(newData);
  };

  // 오프라인 토글 핸들러
  const handleOfflineToggle = (dayIndex: number) => {
    const newData = [...data];
    newData[dayIndex].isOffline = !newData[dayIndex].isOffline;
    onDataChange(newData);
  };

  // 엔트리 추가 핸들러 (최대 개수 제한 포함)
  const handleAddEntry = (dayIndex: number) => {
    const currentEntries = data[dayIndex].entries;

    // 최대 개수 체크
    if (currentEntries.length >= maxStreamingTimeByDay) {
      return;
    }

    const newData = [...data];
    const newEntry = createInitialEntryFromConfig({ cardInputConfig });
    newData[dayIndex] = {
      ...newData[dayIndex],
      entries: [...currentEntries, newEntry],
    };
    onDataChange(newData);
  };

  // 엔트리 제거 핸들러
  const handleRemoveEntry = (dayIndex: number, entryIndex: number) => {
    const newData = [...data];
    const newEntries = newData[dayIndex].entries.filter(
      (_, index) => index !== entryIndex
    );
    // 최소 하나의 엔트리는 유지
    if (newEntries.length === 0) {
      newEntries.push(createInitialEntryFromConfig({ cardInputConfig }));
    }
    newData[dayIndex] = { ...newData[dayIndex], entries: newEntries };
    onDataChange(newData);
  };

  // 오프라인 메모 변경 핸들러
  const handleOfflineMemoChange = (dayIndex: number, value: string) => {
    const newData = [...data];
    newData[dayIndex] = { ...newData[dayIndex], offlineMemo: value };
    onDataChange(newData);
  };

  // 기본 요일 렌더러
  const defaultWeekdayRenderer = (day: TDefaultCard) => (
    <span className="font-semibold text-gray-700">
      {weekdays[weekdayOption][day.day]}
    </span>
  );

  // 기본 필드 렌더링 (다중 엔트리 지원)
  const renderDefaultField = (
    fieldKey: string,
    entry: TEntry,
    dayIndex: number,
    entryIndex: number
  ) => {
    const renderer =
      defaultFieldRenderers[fieldKey as keyof typeof defaultFieldRenderers];
    return renderer
      ? renderer({
          entry,
          dayIndex,
          entryIndex,
          onChange: handleEntryFieldChange,
        })
      : null;
  };

  return (
    <>
      {data.slice(0, 3).map((day, dayIndex) => (
        <SampleDayCard
          className="min-h-20 rounded-[40px] p-5"
          key={day.day}
          weekdayLabel={
            weekdayRenderer ? weekdayRenderer(day) : defaultWeekdayRenderer(day)
          }
          isOffline={day.isOffline}
          onOfflineToggle={() => handleOfflineToggle(dayIndex)}
          offlineToggleLabel={offlineToggleConfig.label}
          expandAnimation={expandAnimation}
          offlineMemoContent={
            isOfflineMemo && day.isOffline ? (
              <textarea
                value={day.offlineMemo || ""}
                onChange={(e) =>
                  handleOfflineMemoChange(dayIndex, e.target.value)
                }
                placeholder="휴방 메모를 입력하세요..."
                className={cn(
                  inputVariants({ variant: "default" }),
                  "resize-none"
                )}
                rows={3}
                maxLength={200}
              />
            ) : undefined
          }
        >
          <div className="flex flex-col gap-6">
            {day.entries.map((entry, entryIndex) => (
              <EntryCard
                key={`${day.day}-${entryIndex}`}
                entry={entry}
                entryIndex={entryIndex}
                showHeader={isMultiple}
                showDeleteButton={isMultiple && day.entries.length > 1}
                onDelete={() => handleRemoveEntry(dayIndex, entryIndex)}
                variant="default"
              >
                {cardInputConfig.fields.map((fieldConfig) => {
                  const isDefaultField =
                    fieldConfig.key in defaultFieldRenderers;

                  return (
                    <div key={fieldConfig.key}>
                      {fieldConfig.label && cardInputConfig.showLabels && (
                        <label
                          className={cn(
                            labelVariants({ size: "xs" }),
                            "block mb-1"
                          )}
                        >
                          {fieldConfig.label}
                        </label>
                      )}
                      {isDefaultField
                        ? renderDefaultField(
                            fieldConfig.key,
                            entry,
                            dayIndex,
                            entryIndex
                          )
                        : renderInputField(
                            fieldConfig,
                            entry,
                            dayIndex,
                            entryIndex
                          )}
                    </div>
                  );
                })}
              </EntryCard>
            ))}
          </div>

          {/* 엔트리 추가 버튼 */}
          {isMultiple && day.entries.length < maxStreamingTimeByDay && (
            <button
              type="button"
              className={cn(
                buttonVariants({
                  variant: "light",
                  size: "md",
                  fullWidth: true,
                }),
                "flex items-center justify-center gap-2"
              )}
              onClick={() => handleAddEntry(dayIndex)}
            >
              <span className="text-lg">+</span>
              <span className="text-sm font-medium">
                방송 추가 ({day.entries.length}/{maxStreamingTimeByDay})
              </span>
            </button>
          )}
        </SampleDayCard>
      ))}
    </>
  );
};

export default TimeTableSampleInputList;
