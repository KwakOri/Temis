import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useTemplateEditorData } from "@/contexts/v2/template-editor-ui-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import { TEntry } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  V2TemplateFieldScope,
  v2_TEMPLATE_DAY_KEYS,
} from "@/types/time-table/template-render-config";
import { v2_createInitialEntryFromFormSchema } from "@/utils/v2/v2-form-data";
import { v2_resolveDayLabelByKey } from "@/utils/v2/template-render-config";
import React from "react";
import V2RuntimeScopeSection from "./fields/scope-section";

type V2RuntimeFieldScope = V2TemplateFieldScope;

const v2_SCOPE_LABELS: Record<V2RuntimeFieldScope, string> = {
  entry: "회차(Entry)",
  card: "요일 카드(Card)",
  global: "전역(Global)",
};

const V2RuntimeForm = () => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const {
    data,
    updateData,
    globalData,
    updateGlobalData,
    currentTheme,
    updateTheme,
  } = useTemplateEditorRuntimeContext();
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
  } = useTemplateEditorData();

  const [selectedDayIndex, setSelectedDayIndex] = React.useState(0);
  const [selectedEntryIndex, setSelectedEntryIndex] = React.useState(0);

  const selectedCard = data[selectedDayIndex] ?? data[0];
  const selectedEntries = selectedCard?.entries ?? [];
  const safeSelectedEntryIndex = Math.min(
    selectedEntryIndex,
    Math.max(0, selectedEntries.length - 1)
  );
  const selectedEntry = selectedEntries[safeSelectedEntryIndex] ?? ({} as TEntry);
  const maxEntryCount = Math.max(1, renderConfig.editorOptions.maxStreamingTimeByDay);
  const allowMultipleEntries = renderConfig.editorOptions.isMultiple;

  React.useEffect(() => {
    setSelectedEntryIndex((prev) =>
      Math.min(prev, Math.max(0, (selectedCard?.entries?.length ?? 1) - 1))
    );
  }, [selectedCard?.entries?.length]);

  const groupedFields = React.useMemo(() => {
    return {
      entry: renderConfig.formSchema.fields.filter(
        (field) => field.scope === "entry"
      ),
      card: renderConfig.formSchema.fields.filter((field) => field.scope === "card"),
      global: renderConfig.formSchema.fields.filter(
        (field) => field.scope === "global"
      ),
    };
  }, [renderConfig.formSchema.fields]);

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

  const updateEntryField = (fieldKey: string, value: string | number) => {
    updateData(
      data.map((card, dayIndex) => {
        if (dayIndex !== selectedDayIndex) return card;
        const nextEntries = card.entries.map((entry, entryIndex) => {
          if (entryIndex !== safeSelectedEntryIndex) return entry;
          return {
            ...entry,
            [fieldKey]: value,
          };
        });
        return {
          ...card,
          entries: nextEntries,
        };
      })
    );
  };

  const updateCardField = (fieldKey: string, value: string | number) => {
    updateData(
      data.map((card, dayIndex) => {
        if (dayIndex !== selectedDayIndex) return card;
        return {
          ...card,
          [fieldKey]: value,
        };
      })
    );
  };

  const updateGlobalField = (fieldKey: string, value: string | number) => {
    updateGlobalData({
      ...globalData,
      [fieldKey]: value,
    });
  };

  const addEntry = () => {
    if (!allowMultipleEntries) return;
    if ((selectedCard?.entries?.length ?? 0) >= maxEntryCount) return;

    const nextEntry = v2_createInitialEntryFromFormSchema({
      formSchema: renderConfig.formSchema,
    });

    updateData(
      data.map((card, dayIndex) => {
        if (dayIndex !== selectedDayIndex) return card;
        return {
          ...card,
          entries: [...card.entries, nextEntry],
        };
      })
    );
    setSelectedEntryIndex((selectedCard?.entries?.length ?? 1));
  };

  const removeEntry = () => {
    if (!allowMultipleEntries) return;
    if ((selectedCard?.entries?.length ?? 0) <= 1) return;

    updateData(
      data.map((card, dayIndex) => {
        if (dayIndex !== selectedDayIndex) return card;
        return {
          ...card,
          entries: card.entries.filter(
            (_, entryIndex) => entryIndex !== safeSelectedEntryIndex
          ),
        };
      })
    );
    setSelectedEntryIndex((prev) => Math.max(0, prev - 1));
  };

  const updateOffline = (value: boolean) => {
    updateData(
      data.map((card, dayIndex) => {
        if (dayIndex !== selectedDayIndex) return card;
        return {
          ...card,
          isOffline: value,
        };
      })
    );
  };

  return (
    <aside className="h-full overflow-y-auto border-l border-slate-800 bg-[#0d1117] p-4 text-gray-100">
      <div className="space-y-4">
        <section className="space-y-3 rounded border border-[#2f3239] bg-[#111317] p-3">
          <h2 className="text-sm font-semibold text-slate-100">런타임 작성</h2>
          <p className="text-xs text-slate-400">
            선택한 요일/회차의 데이터를 편집하면 프리뷰에 즉시 반영됩니다.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <label className="space-y-1 text-xs text-slate-400">
              <span>테마</span>
              <select
                value={currentTheme}
                onChange={(event) => updateTheme(event.target.value as TTheme)}
                className="w-full rounded border border-[#3a3d44] bg-[#1a1d23] px-2.5 py-2 text-sm text-gray-100"
              >
                {themes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span>주 시작일(월)</span>
              <input
                type="date"
                value={mondayDateStr}
                onChange={(event) => updateMondayDate(event.target.value)}
                className="w-full rounded border border-[#3a3d44] bg-[#1a1d23] px-2.5 py-2 text-sm text-gray-100"
              />
            </label>
          </div>
        </section>

        <section className="space-y-2 rounded border border-[#2f3239] bg-[#111317] p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
            요일 선택
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {v2_TEMPLATE_DAY_KEYS.map((dayKey, index) => {
              const label = v2_resolveDayLabelByKey({
                dayKey,
                dayLabelFormat: renderConfig.dayLabelFormat,
                streamingDayFormat: renderConfig.streamingDayFormat,
                fallbackWeekdayOption: renderConfig.weekdayOption,
              });
              const isSelected = selectedDayIndex === index;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setSelectedDayIndex(index)}
                  className={`rounded border px-2 py-1.5 text-xs font-semibold ${
                    isSelected
                      ? "border-[#4f8cff] bg-[#1f355f] text-[#d6e6ff]"
                      : "border-[#3a3d44] bg-[#1a1d23] text-slate-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <label className="mt-2 flex items-center justify-between rounded border border-[#3a3d44] bg-[#1a1d23] px-2.5 py-2 text-xs text-slate-300">
            <span>오프라인 표시</span>
            <input
              type="checkbox"
              checked={Boolean(selectedCard?.isOffline)}
              onChange={(event) => updateOffline(event.target.checked)}
            />
          </label>
        </section>

        {allowMultipleEntries ? (
          <section className="space-y-2 rounded border border-[#2f3239] bg-[#111317] p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
              회차(Entry)
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {selectedEntries.map((_, index) => {
                const isSelected = safeSelectedEntryIndex === index;
                return (
                  <button
                    key={`entry-${index}`}
                    type="button"
                    onClick={() => setSelectedEntryIndex(index)}
                    className={`rounded border px-2 py-1 text-xs font-semibold ${
                      isSelected
                        ? "border-[#4f8cff] bg-[#1f355f] text-[#d6e6ff]"
                        : "border-[#3a3d44] bg-[#1a1d23] text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addEntry}
                disabled={(selectedEntries.length ?? 0) >= maxEntryCount}
                className="rounded border border-[#3a3d44] bg-[#1a1d23] px-2 py-1 text-xs text-slate-200 disabled:opacity-50"
              >
                + 회차
              </button>
              <button
                type="button"
                onClick={removeEntry}
                disabled={(selectedEntries.length ?? 0) <= 1}
                className="rounded border border-rose-500/60 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 disabled:opacity-40"
              >
                - 회차
              </button>
              <span className="text-[11px] text-slate-400">
                {selectedEntries.length}/{maxEntryCount}
              </span>
            </div>
          </section>
        ) : null}

        <V2RuntimeScopeSection
          scope="entry"
          scopeLabel={v2_SCOPE_LABELS.entry}
          fields={groupedFields.entry}
          getValue={(field) => selectedEntry[field.key]}
          onChange={(fieldKey, nextValue) =>
            updateEntryField(fieldKey, nextValue)
          }
        />
        <V2RuntimeScopeSection
          scope="card"
          scopeLabel={v2_SCOPE_LABELS.card}
          fields={groupedFields.card}
          getValue={(field) =>
            (selectedCard as Record<string, unknown>)?.[field.key]
          }
          onChange={(fieldKey, nextValue) =>
            updateCardField(fieldKey, nextValue)
          }
        />
        <V2RuntimeScopeSection
          scope="global"
          scopeLabel={v2_SCOPE_LABELS.global}
          fields={groupedFields.global}
          getValue={(field) => globalData[field.key]}
          onChange={(fieldKey, nextValue) =>
            updateGlobalField(fieldKey, nextValue)
          }
        />

        <section className="space-y-2 rounded border border-[#2f3239] bg-[#111317] p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
            추가 텍스트/이미지
          </h3>
          <label className="space-y-1 text-xs text-slate-400">
            <span>Artist 텍스트</span>
            <input
              type="text"
              value={profileText}
              onChange={(event) => updateProfileText(event.target.value)}
              className="w-full rounded border border-[#3a3d44] bg-[#1a1d23] px-2.5 py-2 text-sm text-gray-100"
              placeholder={renderConfig.profileTextPlaceholder}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            <span>Memo 텍스트</span>
            <textarea
              rows={3}
              value={memoText}
              onChange={(event) => updateMemoText(event.target.value)}
              className="w-full rounded border border-[#3a3d44] bg-[#1a1d23] px-2.5 py-2 text-sm text-gray-100"
              placeholder="메모를 입력하세요"
            />
          </label>
          <div className="space-y-1 text-xs text-slate-400">
            <span>프로필 이미지</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-xs text-slate-300 file:mr-2 file:rounded file:border file:border-slate-500 file:bg-slate-800 file:px-2 file:py-1 file:text-slate-100"
            />
            {imageSrc ? (
              <button
                type="button"
                onClick={() => updateImageSrc(null)}
                className="rounded border border-slate-500 bg-slate-800 px-2 py-1 text-xs text-slate-200"
              >
                이미지 초기화
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </aside>
  );
};

export default V2RuntimeForm;
