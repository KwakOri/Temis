import React, { useMemo, useState } from "react";

import { useTimeTable } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { v2_TEMPLATE_COLOR_KEYS } from "@/types/time-table/v2_template_render_config";

type V2BuilderTab = "canvas" | "layout" | "style" | "data" | "export";

const v2_BUILDER_TABS: Array<{ id: V2BuilderTab; label: string }> = [
  { id: "canvas", label: "캔버스" },
  { id: "layout", label: "레이아웃" },
  { id: "style", label: "스타일" },
  { id: "data", label: "샘플 데이터" },
  { id: "export", label: "내보내기" },
];

const V2TemplateBuilderForm: React.FC = () => {
  const { renderConfig, setRenderConfig } = useV2TemplateRenderConfigContext();
  const { data, updateData, currentTheme, updateTheme, resetData } =
    useV2TimeTableEditorRuntimeContext();
  const { actions } = useTimeTable();
  const [activeTab, setActiveTab] = useState<V2BuilderTab>("canvas");
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const safeUpdateConfig = (
    updater: (
      prev: typeof renderConfig
    ) => typeof renderConfig
  ) => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => updater(prev));
  };

  const updateTemplateSize = (key: "width" | "height", value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      templateSize: {
        ...prev.templateSize,
        [key]: Math.round(value),
      },
      cardSizes: {
        ...prev.cardSizes,
        frame: {
          ...prev.cardSizes.frame,
          [key]: Math.round(value),
        },
      },
    }));
  };

  const updateGridLayout = (
    key: "right" | "top" | "rowGap" | "columnGap" | "columns",
    value: number
  ) => {
    if (!Number.isFinite(value)) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        grid: {
          ...prev.layout.grid,
          [key]: key === "columns" ? Math.max(1, Math.round(value)) : value,
        },
      },
    }));
  };

  const updateWeekFlagLayout = (
    key: "top" | "left" | "fontSize",
    value: number
  ) => {
    if (!Number.isFinite(value)) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        weekFlag: {
          ...prev.layout.weekFlag,
          [key]: value,
        },
      },
    }));
  };

  const updateColor = (key: (typeof v2_TEMPLATE_COLOR_KEYS)[number], value: string) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      componentColors: {
        ...prev.componentColors,
        [key]: value,
      },
    }));
  };

  const updateMaxFontSize = (key: "MAIN_TITLE" | "SUB_TITLE", value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      maxFontSizes: {
        ...prev.maxFontSizes,
        [key]: Math.round(value),
      },
    }));
  };

  const firstCard = data[0];
  const firstEntry = firstCard?.entries?.[0];

  const updateFirstEntryField = (key: string, value: string | boolean) => {
    const next = [...data];
    if (!next[0] || !next[0].entries?.[0]) return;

    next[0] = {
      ...next[0],
      entries: [
        {
          ...next[0].entries[0],
          [key]: value,
        },
        ...next[0].entries.slice(1),
      ],
    };

    updateData(next);
  };

  const updateFirstDayOffline = (isOffline: boolean) => {
    const next = [...data];
    if (!next[0]) return;
    next[0] = {
      ...next[0],
      isOffline,
    };
    updateData(next);
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(renderConfig, null, 2));
      setCopyState("success");
    } catch (error) {
      console.error("Failed to copy render config JSON", error);
      setCopyState("error");
    } finally {
      setTimeout(() => setCopyState("idle"), 1400);
    }
  };

  const themeOptions = useMemo(() => renderConfig.themes ?? [], [renderConfig.themes]);

  const renderCanvasTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">캔버스</h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">width</label>
        <input
          type="number"
          value={renderConfig.templateSize.width}
          onChange={(e) => updateTemplateSize("width", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">height</label>
        <input
          type="number"
          value={renderConfig.templateSize.height}
          onChange={(e) => updateTemplateSize("height", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-500">default theme</label>
        <select
          value={renderConfig.defaultTheme}
          onChange={(e) => {
            const nextTheme = e.target.value;
            safeUpdateConfig((prev) => ({
              ...prev,
              defaultTheme: nextTheme,
            }));
          }}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>

        <label className="text-xs text-gray-500">preview theme</label>
        <select
          value={currentTheme}
          onChange={(e) => updateTheme(e.target.value as typeof currentTheme)}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderLayoutTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">레이아웃</h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">grid right</label>
        <input
          type="number"
          value={renderConfig.layout.grid.right}
          onChange={(e) => updateGridLayout("right", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">grid top</label>
        <input
          type="number"
          value={renderConfig.layout.grid.top}
          onChange={(e) => updateGridLayout("top", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">row gap</label>
        <input
          type="number"
          value={renderConfig.layout.grid.rowGap}
          onChange={(e) => updateGridLayout("rowGap", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">column gap</label>
        <input
          type="number"
          value={renderConfig.layout.grid.columnGap}
          onChange={(e) => updateGridLayout("columnGap", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">columns</label>
        <input
          type="number"
          min={1}
          value={renderConfig.layout.grid.columns}
          onChange={(e) => updateGridLayout("columns", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <h4 className="font-semibold text-sm text-gray-700">주간 플래그</h4>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">top</label>
        <input
          type="number"
          value={renderConfig.layout.weekFlag.top}
          onChange={(e) => updateWeekFlagLayout("top", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">left</label>
        <input
          type="number"
          value={renderConfig.layout.weekFlag.left}
          onChange={(e) => updateWeekFlagLayout("left", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">font size</label>
        <input
          type="number"
          value={renderConfig.layout.weekFlag.fontSize}
          onChange={(e) => updateWeekFlagLayout("fontSize", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
    </div>
  );

  const renderStyleTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">스타일</h3>

      <h4 className="font-semibold text-sm text-gray-700">컴포넌트 색상</h4>
      <div className="space-y-2">
        {v2_TEMPLATE_COLOR_KEYS.map((key) => (
          <label key={key} className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{key}</span>
            <input
              type="color"
              value={renderConfig.componentColors[key] || "#000000"}
              onChange={(e) => updateColor(key, e.target.value)}
              className="w-14 h-8 border rounded bg-white"
            />
          </label>
        ))}
      </div>

      <h4 className="font-semibold text-sm text-gray-700">AutoResizeText</h4>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">main title max</label>
        <input
          type="number"
          value={renderConfig.maxFontSizes.MAIN_TITLE}
          onChange={(e) => updateMaxFontSize("MAIN_TITLE", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">sub title max</label>
        <input
          type="number"
          value={renderConfig.maxFontSizes.SUB_TITLE}
          onChange={(e) => updateMaxFontSize("SUB_TITLE", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">샘플 데이터</h3>
      <p className="text-xs text-gray-500">
        월요일 카드(첫 번째 카드)만 빠르게 조정해서 프리뷰 확인
      </p>

      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">time</label>
        <input
          type="time"
          value={(firstEntry?.time as string) || "09:00"}
          onChange={(e) => updateFirstEntryField("time", e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">mainTitle</label>
        <textarea
          rows={3}
          value={(firstEntry?.mainTitle as string) || ""}
          onChange={(e) => updateFirstEntryField("mainTitle", e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">subTitle</label>
        <input
          type="text"
          value={(firstEntry?.subTitle as string) || ""}
          onChange={(e) => updateFirstEntryField("subTitle", e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
        <span className="text-sm text-gray-700">isGuerrilla</span>
        <input
          type="checkbox"
          checked={Boolean(firstEntry?.isGuerrilla)}
          onChange={(e) => updateFirstEntryField("isGuerrilla", e.target.checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
        <span className="text-sm text-gray-700">monday isOffline</span>
        <input
          type="checkbox"
          checked={Boolean(firstCard?.isOffline)}
          onChange={(e) => updateFirstDayOffline(e.target.checked)}
        />
      </label>
    </div>
  );

  const renderExportTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">내보내기</h3>
      <button
        onClick={handleCopyJson}
        className="w-full bg-timetable-primary text-white py-2 rounded text-sm font-semibold hover:bg-timetable-primary-hover transition"
      >
        renderConfig JSON 복사
      </button>
      {copyState === "success" && (
        <p className="text-xs text-green-600">JSON이 클립보드에 복사됐습니다.</p>
      )}
      {copyState === "error" && (
        <p className="text-xs text-red-600">복사에 실패했습니다. 콘솔을 확인해 주세요.</p>
      )}

      <button
        onClick={() =>
          actions.downloadImage(
            renderConfig.templateSize.width,
            renderConfig.templateSize.height
          )
        }
        className="w-full bg-gray-700 text-white py-2 rounded text-sm font-semibold hover:bg-gray-800 transition"
      >
        프리뷰 PNG 저장
      </button>
      <button
        onClick={resetData}
        className="w-full bg-red-500 text-white py-2 rounded text-sm font-semibold hover:bg-red-600 transition"
      >
        샘플 데이터 리셋
      </button>
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "canvas") return renderCanvasTab();
    if (activeTab === "layout") return renderLayoutTab();
    if (activeTab === "style") return renderStyleTab();
    if (activeTab === "data") return renderDataTab();
    return renderExportTab();
  };

  return (
    <div className="md:h-full min-h-0 md:max-w-[420px] md:min-w-[320px] md:w-[28%] h-full">
      <div className="h-full shrink-0 flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full">
        <div className="flex border-b-2 border-timetable-card-border bg-timetable-card-bg">
          {v2_BUILDER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-2 text-xs font-bold text-center transition-all duration-200 border-b-2 ${
                  isActive
                    ? "text-timetable-primary border-timetable-primary"
                    : "text-gray-500 border-transparent hover:bg-timetable-input-bg hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto p-4 h-full bg-timetable-form-bg">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default V2TemplateBuilderForm;
