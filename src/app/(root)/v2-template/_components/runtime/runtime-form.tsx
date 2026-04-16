import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRuntimeData } from "@/contexts/v2/template-runtime-ui-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import { CardInputConfig, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import React from "react";
import RuntimeInputList from "./form-ui/runtime-input-list";
import RuntimeFormTabs from "./form-ui/runtime-form-tabs";
import RuntimeWeekSelector from "./form-ui/runtime-week-selector";
import TextRenderer from "./form-ui/field-renderers/text-renderer";
import TextareaRenderer from "./form-ui/field-renderers/textarea-renderer";

const V2RuntimeForm = () => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const {
    data,
    updateData,
    globalData,
    updateGlobalData,
    currentTheme,
    updateTheme,
  } = useTemplateRuntimeContext();
  const {
    profileText,
    memoText,
    imageSrc,
    updateProfileText,
    updateMemoText,
    updateImageSrc,
    handleImageChange,
    mondayDateStr,
    updateMondayDate,
  } = useTemplateRuntimeData();
  const [activeTab, setActiveTab] = React.useState("main");

  const themes = React.useMemo(() => {
    const baseThemes = Array.isArray(renderConfig.themes)
      ? renderConfig.themes
      : [];
    if (baseThemes.length === 0) return [renderConfig.defaultTheme];
    if (!baseThemes.includes(renderConfig.defaultTheme)) {
      return [...baseThemes, renderConfig.defaultTheme];
    }
    return baseThemes;
  }, [renderConfig.defaultTheme, renderConfig.themes]);

  const cardInputConfig = React.useMemo<CardInputConfig>(() => {
    return {
      fields: renderConfig.formSchema.fields.map((field) => ({
        key: field.key,
        scope: field.scope,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || "",
        required: field.required,
        maxLength: field.maxLength,
        options: field.options?.map((option) => ({
          value: option.value,
          label: option.label,
        })),
        defaultValue: field.defaultValue,
      })),
      showLabels: renderConfig.formSchema.showLabels ?? true,
      offlineToggle: renderConfig.formSchema.offlineToggle,
    };
  }, [renderConfig.formSchema]);

  const placeholders = React.useMemo<TPlaceholders>(() => {
    const fieldPlaceholders: Record<string, string> = {};
    renderConfig.formSchema.fields.forEach((field) => {
      fieldPlaceholders[field.key] = field.placeholder || "";
    });

    return {
      ...fieldPlaceholders,
      profileText:
        renderConfig.profileTextPlaceholder || "아티스트명을 입력해 주세요",
    };
  }, [renderConfig.formSchema.fields, renderConfig.profileTextPlaceholder]);

  return (
    <aside className="h-full overflow-y-auto border-l border-[#d9cec4] bg-timetable-form-bg p-4 text-gray-800">
      <div className="space-y-4">
        <section className="rounded-[16px] border-2 border-timetable-card-border bg-timetable-card-bg p-3 shadow-[0_2px_3.4px_rgba(0,0,0,0.08)]">
          <h2 className="text-base font-bold text-gray-800">v2 Runtime 작성</h2>
          <p className="mt-1 text-xs text-gray-500">
            기존 폼 UI 기준으로 시간표 데이터를 편집합니다.
          </p>
        </section>

        <RuntimeFormTabs
          activeTab={activeTab}
          onChangeActiveTab={setActiveTab}
          isAddons={true}
        />

        {activeTab === "main" ? (
          <div className="space-y-4">
            <section className="rounded-[16px] border-2 border-timetable-card-border bg-timetable-card-bg p-3 shadow-[0_2px_3.4px_rgba(0,0,0,0.08)]">
              <label className="block text-xs font-semibold text-gray-600">
                테마 선택
              </label>
              <select
                value={currentTheme}
                onChange={(event) => updateTheme(event.target.value as TTheme)}
                className="mt-2 h-10 w-full rounded-lg bg-timetable-input-bg px-3 text-sm text-gray-800 outline-none focus:shadow-[inset_0_0_0_2px_#FF9F45]"
              >
                {themes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </section>

            <RuntimeWeekSelector
              mondayDateStr={mondayDateStr}
              onDateChange={updateMondayDate}
            />

            <RuntimeInputList
              data={data}
              onDataChange={updateData}
              globalData={globalData}
              onGlobalDataChange={updateGlobalData}
              weekdayOption={renderConfig.weekdayOption}
              cardInputConfig={cardInputConfig}
              placeholders={placeholders}
              isMultiple={renderConfig.editorOptions.isMultiple}
              maxStreamingTimeByDay={Math.max(
                1,
                renderConfig.editorOptions.maxStreamingTimeByDay
              )}
              isOfflineMemo={true}
              size="sm"
            />
          </div>
        ) : (
          <section className="space-y-3 rounded-[16px] border-2 border-timetable-card-border bg-timetable-card-bg p-3 shadow-[0_2px_3.4px_rgba(0,0,0,0.08)]">
            <h3 className="text-sm font-bold text-gray-800">추가 기능</h3>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600">
                Artist 텍스트
              </label>
              <TextRenderer
                height="sm"
                value={profileText}
                handleTextChange={updateProfileText}
                placeholder={renderConfig.profileTextPlaceholder}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600">
                Memo 텍스트
              </label>
              <TextareaRenderer
                value={memoText}
                handleTextareaChange={updateMemoText}
                placeholder="메모를 입력하세요"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600">
                프로필 이미지
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-xs text-gray-700 file:mr-2 file:rounded-lg file:border file:border-[#d3c8be] file:bg-white file:px-2 file:py-1 file:text-gray-700"
              />
              {imageSrc ? (
                <button
                  type="button"
                  onClick={() => updateImageSrc(null)}
                  className="mt-2 rounded-lg border border-[#d3c8be] bg-white px-2 py-1 text-xs text-gray-700 hover:bg-[#f7efe8]"
                >
                  이미지 초기화
                </button>
              ) : null}
            </div>
          </section>
        )}

        <section className="rounded-[16px] border-2 border-timetable-card-border bg-timetable-card-bg p-3 shadow-[0_2px_3.4px_rgba(0,0,0,0.08)]">
          <p className="text-xs text-gray-500">
            작성한 값은 자동 저장되며, 즉시 프리뷰에 반영됩니다.
          </p>
        </section>
      </div>
    </aside>
  );
};

export default V2RuntimeForm;
