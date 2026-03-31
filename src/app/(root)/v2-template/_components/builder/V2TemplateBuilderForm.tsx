import React, { useMemo, useState } from "react";

import { useTimeTable } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import {
  V2TemplateAssetMap,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/v2_template_render_config";

type V2BuilderTab =
  | "canvas"
  | "layout"
  | "style"
  | "assets"
  | "data"
  | "export";

const v2_BUILDER_TABS: Array<{ id: V2BuilderTab; label: string }> = [
  { id: "canvas", label: "캔버스" },
  { id: "layout", label: "레이아웃" },
  { id: "style", label: "스타일" },
  { id: "assets", label: "에셋" },
  { id: "data", label: "샘플 데이터" },
  { id: "export", label: "내보내기" },
];

const v2_ASSET_KEYS: Array<keyof V2TemplateAssetMap> = [
  "bgByTheme",
  "topObjectByTheme",
  "onlineByTheme",
  "offlineByTheme",
  "profileFrameByTheme",
  "profileBgByTheme",
];

const v2_ASSET_LABELS: Record<keyof V2TemplateAssetMap, string> = {
  bgByTheme: "배경",
  topObjectByTheme: "상단 오브젝트",
  onlineByTheme: "온라인 카드",
  offlineByTheme: "오프라인 카드",
  profileFrameByTheme: "프로필 프레임",
  profileBgByTheme: "프로필 배경",
};

const v2_STYLE_PROPERTY_CATALOG = [
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "color",
  "opacity",
  "zIndex",
  "display",
  "justifyContent",
  "alignItems",
  "transform",
  "transformOrigin",
  "rotate",
  "whiteSpace",
  "wordBreak",
] as const;

type V2StyleSectionKey =
  | "streamingDayStyle"
  | "streamingDateStyle"
  | "streamingTimeStyle"
  | "mainTitleWrapperStyle"
  | "mainTitleTextStyle"
  | "subTitleTextStyle";

const V2TemplateBuilderForm: React.FC = () => {
  const { renderConfig, setRenderConfig } = useV2TemplateRenderConfigContext();
  const { data, updateData, currentTheme, updateTheme, resetData } =
    useV2TimeTableEditorRuntimeContext();
  const { actions } = useTimeTable();

  const [activeTab, setActiveTab] = useState<V2BuilderTab>("canvas");
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [assetTheme, setAssetTheme] = useState<string>(
    renderConfig.defaultTheme || "first"
  );

  const safeUpdateConfig = (
    updater: (prev: typeof renderConfig) => typeof renderConfig
  ) => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => updater(prev));
  };

  const themeOptions = useMemo(() => {
    const base = renderConfig.themes?.length
      ? renderConfig.themes
      : [renderConfig.defaultTheme || "first"];

    if (!base.includes(renderConfig.defaultTheme)) {
      return [...base, renderConfig.defaultTheme];
    }

    return base;
  }, [renderConfig.defaultTheme, renderConfig.themes]);

  const fontTokenOptions = useMemo(() => {
    const baseTokens = ["primary", "secondary", "tertiary", "quaternary"];
    const registryKeys = Object.keys(renderConfig.fonts.registry ?? {});
    return Array.from(new Set([...baseTokens, ...registryKeys]));
  }, [renderConfig.fonts.registry]);

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
      layout: {
        ...prev.layout,
        topObjectContainer: {
          ...prev.layout.topObjectContainer,
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
    key: "top" | "left" | "fontSize" | "fontWeight",
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

  const updateCellLayout = (
    key:
      | "streamingTime"
      | "streamingDate"
      | "mainTitleContainer"
      | "subTitleContainer",
    patch: Record<string, number>
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        cell: {
          ...prev.layout.cell,
          [key]: {
            ...(prev.layout.cell[key] as Record<string, number>),
            ...patch,
          },
        },
      },
    }));
  };

  const getStyleSectionMap = (section: V2StyleSectionKey) =>
    ((renderConfig.layout.cell[section] as Record<string, string | number>) ??
      {}) as Record<string, string | number>;

  const parseStyleValue = (rawValue: string): string | number => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return "";
    if (/^-?\\d+(\\.\\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return trimmed;
  };

  const updateStyleSection = (
    section: V2StyleSectionKey,
    nextMap: Record<string, string | number>
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        cell: {
          ...prev.layout.cell,
          [section]: nextMap,
        },
      },
    }));
  };

  const addStyleProperty = (section: V2StyleSectionKey) => {
    const currentMap = getStyleSectionMap(section);
    const nextKey =
      v2_STYLE_PROPERTY_CATALOG.find((property) => currentMap[property] === undefined) ??
      `custom_${Object.keys(currentMap).length + 1}`;

    updateStyleSection(section, {
      ...currentMap,
      [nextKey]: "",
    });
  };

  const removeStyleProperty = (section: V2StyleSectionKey, key: string) => {
    const currentMap = getStyleSectionMap(section);
    const nextMap = { ...currentMap };
    delete nextMap[key];
    updateStyleSection(section, nextMap);
  };

  const renameStyleProperty = (
    section: V2StyleSectionKey,
    currentKey: string,
    nextKeyRaw: string
  ) => {
    const nextKey = nextKeyRaw.trim();
    if (!nextKey) return;

    const currentMap = getStyleSectionMap(section);
    const value = currentMap[currentKey];
    const nextMap = { ...currentMap };
    delete nextMap[currentKey];
    nextMap[nextKey] = value;
    updateStyleSection(section, nextMap);
  };

  const updateStylePropertyValue = (
    section: V2StyleSectionKey,
    key: string,
    rawValue: string
  ) => {
    const currentMap = getStyleSectionMap(section);
    updateStyleSection(section, {
      ...currentMap,
      [key]: parseStyleValue(rawValue),
    });
  };

  const updateCellOptions = (
    optionKey: "mainTitleOptions" | "subTitleOptions",
    patch: { maxFontSize?: number; multiline?: boolean }
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        cell: {
          ...prev.layout.cell,
          [optionKey]: {
            ...(prev.layout.cell[optionKey] ?? {}),
            ...patch,
          },
        },
      },
    }));
  };

  const updateColor = (
    key: (typeof v2_TEMPLATE_COLOR_KEYS)[number],
    value: string
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      componentColors: {
        ...prev.componentColors,
        [key]: value,
      },
    }));
  };

  const updateComponentFont = (
    key: (typeof v2_TEMPLATE_COLOR_KEYS)[number],
    value: string
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      componentFonts: {
        ...prev.componentFonts,
        [key]: value,
      },
    }));
  };

  const updateMaxFontSize = (
    key: "MAIN_TITLE" | "SUB_TITLE" | "ARTIST",
    value: number
  ) => {
    if (!Number.isFinite(value) || value <= 0) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      maxFontSizes: {
        ...prev.maxFontSizes,
        [key]: Math.round(value),
      },
    }));
  };

  const updateAssetUrl = (
    key: keyof V2TemplateAssetMap,
    theme: string,
    value: string
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [key]: {
          ...prev.assets[key],
          [theme]: value.trim() === "" ? null : value,
        },
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

  const renderStyleSectionEditor = ({
    title,
    section,
  }: {
    title: string;
    section: V2StyleSectionKey;
  }) => {
    const sectionMap = getStyleSectionMap(section);
    const entries = Object.entries(sectionMap);

    return (
      <div className="rounded border border-gray-300 bg-white p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-gray-700">{title}</h5>
          <button
            type="button"
            onClick={() => addStyleProperty(section)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            + CSS 속성 추가
          </button>
        </div>

        {entries.length === 0 && (
          <p className="text-xs text-gray-400">추가된 속성이 없습니다.</p>
        )}

        {entries.map(([property, value], index) => (
          <div key={`${section}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              list={`v2-style-props-${section}`}
              value={property}
              onChange={(e) =>
                renameStyleProperty(section, property, e.target.value)
              }
              className="px-2 py-1 rounded border border-gray-300 text-xs"
            />
            <input
              value={String(value)}
              onChange={(e) =>
                updateStylePropertyValue(section, property, e.target.value)
              }
              className="px-2 py-1 rounded border border-gray-300 text-xs"
              placeholder="값"
            />
            <button
              type="button"
              onClick={() => removeStyleProperty(section, property)}
              className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        ))}

        <datalist id={`v2-style-props-${section}`}>
          {v2_STYLE_PROPERTY_CATALOG.map((property) => (
            <option key={property} value={property} />
          ))}
        </datalist>
      </div>
    );
  };

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
            if (!themeOptions.includes(assetTheme)) {
              setAssetTheme(nextTheme);
            }
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

      <h4 className="font-semibold text-sm text-gray-700">Grid</h4>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">right</label>
        <input
          type="number"
          value={renderConfig.layout.grid.right}
          onChange={(e) => updateGridLayout("right", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">top</label>
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

      <h4 className="font-semibold text-sm text-gray-700">Week Flag</h4>
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
          onChange={(e) =>
            updateWeekFlagLayout("fontSize", Number(e.target.value))
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">font weight</label>
        <input
          type="number"
          value={renderConfig.layout.weekFlag.fontWeight}
          onChange={(e) =>
            updateWeekFlagLayout("fontWeight", Number(e.target.value))
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <h4 className="font-semibold text-sm text-gray-700">Cell</h4>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">streamingTime top</label>
        <input
          type="number"
          value={renderConfig.layout.cell.streamingTime.top}
          onChange={(e) =>
            updateCellLayout("streamingTime", { top: Number(e.target.value) })
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">streamingTime font</label>
        <input
          type="number"
          value={renderConfig.layout.cell.streamingTime.fontSize}
          onChange={(e) =>
            updateCellLayout("streamingTime", {
              fontSize: Number(e.target.value),
            })
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />

        <label className="text-xs text-gray-500">main wrapper top</label>
        <input
          type="number"
          value={renderConfig.layout.cell.mainTitleContainer.top}
          onChange={(e) =>
            updateCellLayout("mainTitleContainer", {
              top: Number(e.target.value),
            })
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">main wrapper width%</label>
        <input
          type="number"
          value={renderConfig.layout.cell.mainTitleContainer.widthPercent}
          onChange={(e) =>
            updateCellLayout("mainTitleContainer", {
              widthPercent: Number(e.target.value),
            })
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />

        <label className="text-xs text-gray-500">sub wrapper top</label>
        <input
          type="number"
          value={renderConfig.layout.cell.subTitleContainer.top}
          onChange={(e) =>
            updateCellLayout("subTitleContainer", {
              top: Number(e.target.value),
            })
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">sub wrapper width%</label>
        <input
          type="number"
          value={renderConfig.layout.cell.subTitleContainer.widthPercent}
          onChange={(e) =>
            updateCellLayout("subTitleContainer", {
              widthPercent: Number(e.target.value),
            })
          }
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

      <h4 className="font-semibold text-sm text-gray-700">컴포넌트 폰트 토큰</h4>
      <div className="space-y-2">
        {v2_TEMPLATE_COLOR_KEYS.map((key) => (
          <label key={key} className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{key}</span>
            <select
              value={renderConfig.componentFonts[key]}
              onChange={(e) => updateComponentFont(key, e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
            >
              {fontTokenOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-700">StreamingDay</h4>
        {renderStyleSectionEditor({
          title: "style",
          section: "streamingDayStyle",
        })}
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-700">StreamingDate</h4>
        {renderStyleSectionEditor({
          title: "style",
          section: "streamingDateStyle",
        })}
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-700">StreamingTime</h4>
        {renderStyleSectionEditor({
          title: "style",
          section: "streamingTimeStyle",
        })}
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-700">MainTitle</h4>

        <div className="space-y-2">
          {renderStyleSectionEditor({
            title: "wrapper > style",
            section: "mainTitleWrapperStyle",
          })}
        </div>

        <div className="space-y-2">
          {renderStyleSectionEditor({
            title: "content > style",
            section: "mainTitleTextStyle",
          })}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500">content / maxFontSize</label>
            <input
              type="number"
              value={
                renderConfig.layout.cell.mainTitleOptions?.maxFontSize ??
                renderConfig.maxFontSizes.MAIN_TITLE
              }
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!Number.isFinite(value) || value <= 0) return;
                updateCellOptions("mainTitleOptions", { maxFontSize: value });
                updateMaxFontSize("MAIN_TITLE", value);
              }}
              className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
            />
          </div>

          <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
            <span className="text-sm text-gray-700">content / multiline</span>
            <input
              type="checkbox"
              checked={Boolean(
                renderConfig.layout.cell.mainTitleOptions?.multiline ?? true
              )}
              onChange={(e) =>
                updateCellOptions("mainTitleOptions", {
                  multiline: e.target.checked,
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-700">SubTitle</h4>
        {renderStyleSectionEditor({
          title: "content > style",
          section: "subTitleTextStyle",
        })}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500">content / maxFontSize</label>
          <input
            type="number"
            value={
              renderConfig.layout.cell.subTitleOptions?.maxFontSize ??
              renderConfig.maxFontSizes.SUB_TITLE
            }
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value) || value <= 0) return;
              updateCellOptions("subTitleOptions", { maxFontSize: value });
              updateMaxFontSize("SUB_TITLE", value);
            }}
            className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
          />
        </div>
        <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
          <span className="text-sm text-gray-700">content / multiline</span>
          <input
            type="checkbox"
            checked={Boolean(
              renderConfig.layout.cell.subTitleOptions?.multiline ?? true
            )}
            onChange={(e) =>
              updateCellOptions("subTitleOptions", {
                multiline: e.target.checked,
              })
            }
          />
        </label>
      </div>
    </div>
  );

  const renderAssetsTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">에셋 URL</h3>

      <div className="grid grid-cols-2 items-center gap-2">
        <label className="text-xs text-gray-500">theme</label>
        <select
          value={assetTheme}
          onChange={(e) => setAssetTheme(e.target.value)}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {v2_ASSET_KEYS.map((key) => (
          <div key={key} className="space-y-1">
            <label className="text-xs text-gray-500 block">{v2_ASSET_LABELS[key]}</label>
            <input
              type="text"
              value={renderConfig.assets[key][assetTheme] ?? ""}
              onChange={(e) => updateAssetUrl(key, assetTheme, e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-xs"
            />
          </div>
        ))}
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
    if (activeTab === "assets") return renderAssetsTab();
    if (activeTab === "data") return renderDataTab();
    return renderExportTab();
  };

  return (
    <div className="md:h-full min-h-0 md:max-w-[440px] md:min-w-[330px] md:w-[30%] h-full">
      <div className="h-full shrink-0 flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full">
        <div className="flex border-b-2 border-timetable-card-border bg-timetable-card-bg">
          {v2_BUILDER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-1 text-[11px] font-bold text-center transition-all duration-200 border-b-2 ${
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
