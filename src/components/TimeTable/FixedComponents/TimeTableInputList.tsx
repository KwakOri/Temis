import AdaptiveTimeRenderer from "@/components/TimeTable/fieldRenderer/AdaptiveTimeRenderer";
import DescriptionRenderer from "@/components/TimeTable/fieldRenderer/DescriptionRenderer";
import TopicRenderer from "@/components/TimeTable/fieldRenderer/TopicRenderer";
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

const TimeTableInputList: React.FC<TimeTableInputListProps> = ({
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
    maxHeight: "1000px",
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              게릴라
            </span>
            <button
              type="button"
              className={`w-8 h-4 flex items-center rounded-full p-0.5 duration-200 ease-in-out ${
                entry.isGuerrilla ? "bg-orange-500" : "bg-gray-300"
              }`}
              onClick={() =>
                onChange(
                  dayIndex,
                  entryIndex,
                  "isGuerrilla",
                  !entry.isGuerrilla
                )
              }
              aria-label="게릴라방송 토글"
              title={entry.isGuerrilla ? "게릴라방송 ON" : "게릴라방송 OFF"}
            >
              <div
                className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-200 ease-in-out ${
                  entry.isGuerrilla ? "translate-x-3.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
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
        <TopicRenderer
          value={entry.topic as string}
          placeholder={placeholders.topic}
          handleTopicChange={handleTopicChange}
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
        <DescriptionRenderer
          value={entry.description as string}
          placeholder={placeholders.description}
          handleDescriptionChange={handleDescriptionChange}
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
          <TopicRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTopicChange={(newValue) =>
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
          <DescriptionRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleDescriptionChange={(newValue) =>
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                게릴라
              </span>
              <button
                type="button"
                className={`w-8 h-4 flex items-center rounded-full p-0.5 duration-200 ease-in-out ${
                  entry.isGuerrilla ? "bg-orange-500" : "bg-gray-300"
                }`}
                onClick={() =>
                  handleEntryFieldChange(
                    dayIndex,
                    entryIndex,
                    "isGuerrilla",
                    !entry.isGuerrilla
                  )
                }
                aria-label="게릴라방송 토글"
                title={entry.isGuerrilla ? "게릴라방송 ON" : "게릴라방송 OFF"}
              >
                <div
                  className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-200 ease-in-out ${
                    entry.isGuerrilla ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>
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
          <TopicRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTopicChange={(newValue) =>
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
          <TopicRenderer
            value={value}
            placeholder={fieldConfig.placeholder || ""}
            handleTopicChange={(newValue) =>
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
    <div className={containerClassName}>
      {data.map((day, dayIndex) => (
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
                onClick={() => handleOfflineToggle(dayIndex)}
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

          {/* 확장 가능한 입력 필드들 - 다중 엔트리 지원 */}
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
              {day.entries.map((entry, entryIndex) => (
                <div
                  key={`${day.day}-${entryIndex}`}
                  className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-200"
                >
                  {/* 엔트리 헤더 - 방송 번호와 삭제 버튼 */}
                  <div className="flex justify-between items-center mb-2">
                    {isMultiple && (
                      <span className="text-sm font-medium text-gray-600">
                        방송 {entryIndex + 1}
                      </span>
                    )}
                    {isMultiple && day.entries.length > 1 && (
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded transition-colors"
                        onClick={() => handleRemoveEntry(dayIndex, entryIndex)}
                        aria-label="엔트리 삭제"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {/* 각 엔트리의 필드들 */}
                  <div className="space-y-3">
                    {cardInputConfig.fields.map((fieldConfig) => {
                      const isDefaultField =
                        fieldConfig.key in defaultFieldRenderers;

                      return (
                        <div key={fieldConfig.key}>
                          {fieldConfig.label && cardInputConfig.showLabels && (
                            <label className="block text-xs font-medium text-gray-600 mb-1">
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
                  </div>
                </div>
              ))}

              {/* 엔트리 추가 버튼 - isMultiple이 true이고 최대 개수에 미달인 경우에만 표시 */}
              {isMultiple && day.entries.length < maxStreamingTimeByDay && (
                <button
                  type="button"
                  className="w-full py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                  onClick={() => handleAddEntry(dayIndex)}
                >
                  <span className="text-lg">+</span>
                  <span className="text-sm">
                    방송 추가 ({day.entries.length}/{maxStreamingTimeByDay})
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 오프라인 메모 필드 */}
          {isOfflineMemo && day.isOffline && (
            <div className="pt-2">
              <textarea
                value={day.offlineMemo || ""}
                onChange={(e) =>
                  handleOfflineMemoChange(dayIndex, e.target.value)
                }
                placeholder="휴방 메모를 입력하세요..."
                className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={3}
                maxLength={200}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TimeTableInputList;
