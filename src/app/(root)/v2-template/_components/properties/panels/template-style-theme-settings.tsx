"use client";

import React from "react";

import {
  V2TemplateColorKey,
  V2TemplateDayKey,
  V2TemplateFontFaceSource,
  V2TemplateFontRegistryItem,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";

interface TemplateStyleThemeSettingsProps {
  renderConfig: V2TemplateRenderConfig;
  colorKeys: readonly V2TemplateColorKey[];
  baseFontTokenKeys: readonly (keyof V2TemplateRenderConfig["baseFonts"])[];
  fontDisplayOptions: readonly NonNullable<V2TemplateFontRegistryItem["display"]>[];
  fontStyleOptions: readonly NonNullable<V2TemplateFontFaceSource["style"]>[];
  fontFormatOptions: readonly NonNullable<V2TemplateFontFaceSource["format"]>[];
  dayKeyOptions: Array<{ value: V2TemplateDayKey; label: string }>;
  fontRegistryKeys: string[];
  fontTokenOptions: string[];
  onOpenBoilerplateSettings: () => void;
  onUpdateColor: (key: V2TemplateColorKey, value: string) => void;
  onUpdateBaseFontToken: (
    tokenKey: keyof V2TemplateRenderConfig["baseFonts"],
    registryKey: string
  ) => void;
  onUpdateComponentFont: (key: V2TemplateColorKey, value: string) => void;
  onAddFontRegistryItem: () => void;
  onRemoveFontRegistryItem: (registryKey: string) => void;
  onSyncFontRegistryKeyWithFamily: (registryKey: string) => string | null;
  onApplyFontFaceCssSnippet: (
    registryKey: string,
    cssText: string
  ) => string | null;
  onUpdateFontRegistryMeta: (
    registryKey: string,
    patch: Partial<Pick<V2TemplateFontRegistryItem, "family" | "display">>
  ) => void;
  onAddFontFace: (registryKey: string) => void;
  onUpdateFontFace: (
    registryKey: string,
    faceIndex: number,
    patch: Partial<V2TemplateFontFaceSource>
  ) => void;
  onRemoveFontFace: (registryKey: string, faceIndex: number) => void;
  parseFontWeightInput: (rawValue: string) => number | string;
  onUpdateStreamingDayFormat: (
    patch: Partial<V2TemplateRenderConfig["streamingDayFormat"]>
  ) => void;
  onUpdateStreamingDayCustomLabel: (dayKey: V2TemplateDayKey, value: string) => void;
  onUpdateStreamingTimeFormat: (
    patch: Partial<V2TemplateRenderConfig["streamingTimeFormat"]>
  ) => void;
  onUpdateWeekDateFormat: (
    patch: Partial<V2TemplateRenderConfig["weekDateFormat"]>
  ) => void;
}

const TemplateStyleThemeSettings: React.FC<TemplateStyleThemeSettingsProps> = ({
  renderConfig,
  colorKeys,
  baseFontTokenKeys,
  fontDisplayOptions,
  fontStyleOptions,
  fontFormatOptions,
  dayKeyOptions,
  fontRegistryKeys,
  fontTokenOptions,
  onOpenBoilerplateSettings,
  onUpdateColor,
  onUpdateBaseFontToken,
  onUpdateComponentFont,
  onAddFontRegistryItem,
  onRemoveFontRegistryItem,
  onSyncFontRegistryKeyWithFamily,
  onApplyFontFaceCssSnippet,
  onUpdateFontRegistryMeta,
  onAddFontFace,
  onUpdateFontFace,
  onRemoveFontFace,
  parseFontWeightInput,
  onUpdateStreamingDayFormat,
  onUpdateStreamingDayCustomLabel,
  onUpdateStreamingTimeFormat,
  onUpdateWeekDateFormat,
}) => {
  const [fontFaceCssDraftByKey, setFontFaceCssDraftByKey] = React.useState<
    Record<string, string>
  >({});
  const [fontFaceCssEditorOpenByKey, setFontFaceCssEditorOpenByKey] =
    React.useState<Record<string, boolean>>({});
  const previousFontRegistryKeysRef = React.useRef<string[]>(fontRegistryKeys);

  React.useEffect(() => {
    const previousKeySet = new Set(previousFontRegistryKeysRef.current);

    setFontFaceCssDraftByKey((prev) => {
      const next: Record<string, string> = {};
      fontRegistryKeys.forEach((registryKey) => {
        next[registryKey] = prev[registryKey] ?? "";
      });
      return next;
    });
    setFontFaceCssEditorOpenByKey((prev) => {
      const next: Record<string, boolean> = {};
      fontRegistryKeys.forEach((registryKey) => {
        if (prev[registryKey] !== undefined) {
          next[registryKey] = prev[registryKey];
          return;
        }
        next[registryKey] = !previousKeySet.has(registryKey);
      });
      return next;
    });
    previousFontRegistryKeysRef.current = [...fontRegistryKeys];
  }, [fontRegistryKeys]);

  const remapFontFaceEditorState = React.useCallback(
    (fromKey: string, toKey: string) => {
      if (!toKey || fromKey === toKey) return;
      setFontFaceCssDraftByKey((prev) => {
        if (!(fromKey in prev)) return prev;
        const next = { ...prev };
        next[toKey] = prev[fromKey] ?? "";
        delete next[fromKey];
        return next;
      });
      setFontFaceCssEditorOpenByKey((prev) => {
        if (!(fromKey in prev)) return prev;
        const next = { ...prev };
        next[toKey] = prev[fromKey] ?? false;
        delete next[fromKey];
        return next;
      });
    },
    []
  );

  const commitFontFamilyKeySync = React.useCallback(
    (registryKey: string) => {
      const nextRegistryKey = onSyncFontRegistryKeyWithFamily(registryKey);
      if (!nextRegistryKey || nextRegistryKey === registryKey) return;
      remapFontFaceEditorState(registryKey, nextRegistryKey);
    },
    [onSyncFontRegistryKeyWithFamily, remapFontFaceEditorState]
  );

  const applyFontFaceCssInput = (registryKey: string) => {
    const cssText = fontFaceCssDraftByKey[registryKey] ?? "";
    const nextRegistryKey = onApplyFontFaceCssSnippet(registryKey, cssText);
    if (!nextRegistryKey) return;
    setFontFaceCssDraftByKey((prev) => {
      const next = { ...prev };
      delete next[registryKey];
      next[nextRegistryKey] = "";
      return next;
    });
    setFontFaceCssEditorOpenByKey((prev) => {
      const next = { ...prev };
      delete next[registryKey];
      next[nextRegistryKey] = false;
      return next;
    });
  };

  return (
    <>
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-gray-200">
              보일러플레이트 설정
            </h4>
            <p className="text-xs text-gray-400">
              설정 버튼으로 항목별 기본 CSS 속성을 팝업에서 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBoilerplateSettings}
            className="shrink-0 px-3 py-2 rounded border border-[#4f8cff] bg-[#1a2c4f] text-xs font-semibold text-blue-200 hover:bg-[#1f3661]"
          >
            설정 열기
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">포맷 설정</h4>

        <div className="space-y-2 rounded border border-[#2e3138] bg-[#15171b] p-2">
          <p className="text-xs font-semibold text-gray-300">Streaming Day</p>
          <div className="grid grid-cols-2 gap-2 items-center">
            <label className="text-xs text-gray-400">언어</label>
            <select
              value={renderConfig.streamingDayFormat.locale}
              onChange={(event) =>
                onUpdateStreamingDayFormat({
                  locale: event.target.value as "kr" | "en" | "jp",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="kr">kr</option>
              <option value="en">en</option>
              <option value="jp">jp</option>
            </select>
            <label className="text-xs text-gray-400">표기 길이</label>
            <select
              value={renderConfig.streamingDayFormat.width}
              onChange={(event) =>
                onUpdateStreamingDayFormat({
                  width: event.target.value as "narrow" | "short" | "long",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="narrow">narrow</option>
              <option value="short">short</option>
              <option value="long">long</option>
            </select>
            <label className="text-xs text-gray-400">문자 케이스</label>
            <select
              value={renderConfig.streamingDayFormat.caseStyle}
              onChange={(event) =>
                onUpdateStreamingDayFormat({
                  caseStyle: event.target.value as
                    | "original"
                    | "upper"
                    | "lower"
                    | "capitalize",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="original">original</option>
              <option value="upper">upper</option>
              <option value="lower">lower</option>
              <option value="capitalize">capitalize</option>
            </select>
          </div>
          <p className="text-[11px] text-gray-500">
            요일별 커스텀 텍스트를 입력하면 locale/길이/케이스 설정보다 우선 적용됩니다.
          </p>
          <div className="space-y-2">
            {dayKeyOptions.map((option) => (
              <label
                key={`day-format-custom-${option.value}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-gray-400 min-w-20">{option.value}</span>
                <input
                  value={renderConfig.streamingDayFormat.custom[option.value] ?? ""}
                  onChange={(event) =>
                    onUpdateStreamingDayCustomLabel(option.value, event.target.value)
                  }
                  placeholder={option.label}
                  className="min-w-0 flex-1 px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded border border-[#2e3138] bg-[#15171b] p-2">
          <p className="text-xs font-semibold text-gray-300">Streaming Time</p>
          <div className="grid grid-cols-2 gap-2 items-center">
            <label className="text-xs text-gray-400">시간제</label>
            <select
              value={renderConfig.streamingTimeFormat.hourCycle}
              onChange={(event) =>
                onUpdateStreamingTimeFormat({
                  hourCycle: event.target.value as "h12" | "h24",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="h12">12-hour</option>
              <option value="h24">24-hour</option>
            </select>
            <label className="text-xs text-gray-400">시 0패딩</label>
            <select
              value={renderConfig.streamingTimeFormat.padHour ? "yes" : "no"}
              onChange={(event) =>
                onUpdateStreamingTimeFormat({
                  padHour: event.target.value === "yes",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
            <label className="text-xs text-gray-400">AM/PM 표시</label>
            <select
              value={renderConfig.streamingTimeFormat.showMeridiem ? "yes" : "no"}
              onChange={(event) =>
                onUpdateStreamingTimeFormat({
                  showMeridiem: event.target.value === "yes",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
            <label className="text-xs text-gray-400">AM/PM 스타일</label>
            <select
              value={renderConfig.streamingTimeFormat.meridiemStyle}
              onChange={(event) =>
                onUpdateStreamingTimeFormat({
                  meridiemStyle: event.target.value as "upper" | "lower" | "kr",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="upper">AM/PM</option>
              <option value="lower">am/pm</option>
              <option value="kr">오전/오후</option>
            </select>
            <label className="text-xs text-gray-400">AM/PM 위치</label>
            <select
              value={renderConfig.streamingTimeFormat.meridiemPosition}
              onChange={(event) =>
                onUpdateStreamingTimeFormat({
                  meridiemPosition: event.target.value as "prefix" | "suffix",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="prefix">앞</option>
              <option value="suffix">뒤</option>
            </select>
            <label className="text-xs text-gray-400">시/분 구분자</label>
            <input
              value={renderConfig.streamingTimeFormat.timeSeparator}
              onChange={(event) =>
                onUpdateStreamingTimeFormat({
                  timeSeparator: event.target.value,
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              placeholder=":"
            />
            <label className="text-xs text-gray-400">AM/PM 구분자</label>
            <input
              value={renderConfig.streamingTimeFormat.meridiemSeparator}
              onChange={(event) =>
                onUpdateStreamingTimeFormat({
                  meridiemSeparator: event.target.value,
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              placeholder="공백"
            />
          </div>
        </div>

        <div className="space-y-2 rounded border border-[#2e3138] bg-[#15171b] p-2">
          <p className="text-xs font-semibold text-gray-300">Week Date</p>
          <div className="grid grid-cols-2 gap-2 items-center">
            <label className="text-xs text-gray-400">언어</label>
            <select
              value={renderConfig.weekDateFormat.locale}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  locale: event.target.value as "kr" | "en" | "jp",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="kr">kr</option>
              <option value="en">en</option>
              <option value="jp">jp</option>
            </select>
            <label className="text-xs text-gray-400">날짜 순서</label>
            <select
              value={renderConfig.weekDateFormat.dateOrder}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  dateOrder: event.target.value as
                    | "locale"
                    | "ymd"
                    | "mdy"
                    | "dmy",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="locale">locale</option>
              <option value="ymd">ymd</option>
              <option value="mdy">mdy</option>
              <option value="dmy">dmy</option>
            </select>
            <label className="text-xs text-gray-400">연도 포함</label>
            <select
              value={renderConfig.weekDateFormat.includeYear ? "yes" : "no"}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  includeYear: event.target.value === "yes",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
            <label className="text-xs text-gray-400">연도 스타일</label>
            <select
              value={renderConfig.weekDateFormat.yearStyle}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  yearStyle: event.target.value as "numeric" | "2-digit",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="numeric">numeric</option>
              <option value="2-digit">2-digit</option>
            </select>
            <label className="text-xs text-gray-400">월 스타일</label>
            <select
              value={renderConfig.weekDateFormat.monthStyle}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  monthStyle: event.target.value as
                    | "numeric"
                    | "2-digit"
                    | "short"
                    | "long",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="numeric">numeric</option>
              <option value="2-digit">2-digit</option>
              <option value="short">short</option>
              <option value="long">long</option>
            </select>
            <label className="text-xs text-gray-400">일 스타일</label>
            <select
              value={renderConfig.weekDateFormat.dateStyle}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  dateStyle: event.target.value as "numeric" | "2-digit",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="numeric">numeric</option>
              <option value="2-digit">2-digit</option>
            </select>
            <label className="text-xs text-gray-400">문자 케이스</label>
            <select
              value={renderConfig.weekDateFormat.caseStyle}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  caseStyle: event.target.value as
                    | "original"
                    | "upper"
                    | "lower"
                    | "capitalize",
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            >
              <option value="original">original</option>
              <option value="upper">upper</option>
              <option value="lower">lower</option>
              <option value="capitalize">capitalize</option>
            </select>
            <label className="text-xs text-gray-400">날짜 구분자</label>
            <input
              value={renderConfig.weekDateFormat.dateSeparator}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  dateSeparator: event.target.value,
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              placeholder="."
            />
            <label className="text-xs text-gray-400">월/일 구분자</label>
            <input
              value={renderConfig.weekDateFormat.monthDateSeparator}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  monthDateSeparator: event.target.value,
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              placeholder="공백"
            />
            <label className="text-xs text-gray-400">범위 구분자</label>
            <input
              value={renderConfig.weekDateFormat.rangeSeparator}
              onChange={(event) =>
                onUpdateWeekDateFormat({
                  rangeSeparator: event.target.value,
                })
              }
              className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              placeholder=" - "
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">컴포넌트 색상</h4>
        <p className="text-xs text-gray-400">
          토큰 값 관리 영역입니다. 오브젝트별 토큰 선택은 속성 탭에서 설정합니다.
        </p>
        <div className="space-y-2">
          {colorKeys.map((key) => (
            <label key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">{key}</span>
              <input
                type="color"
                value={renderConfig.componentColors[key] || "#000000"}
                onChange={(event) => onUpdateColor(key, event.target.value)}
                className="w-14 h-8 rounded border border-[#3a3d44] bg-[#2a2d33]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">베이스 폰트 토큰</h4>
        {fontRegistryKeys.length === 0 ? (
          <p className="text-xs text-amber-300">
            등록된 폰트가 없습니다. 아래 폰트 레지스트리에서 먼저 추가해 주세요.
          </p>
        ) : (
          <div className="space-y-2">
            {baseFontTokenKeys.map((tokenKey) => (
              <label
                key={tokenKey}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-gray-400">{tokenKey}</span>
                <select
                  value={renderConfig.baseFonts[tokenKey]}
                  onChange={(event) =>
                    onUpdateBaseFontToken(tokenKey, event.target.value)
                  }
                  className="px-2 py-1 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                >
                  {fontRegistryKeys.map((registryKey) => (
                    <option key={registryKey} value={registryKey}>
                      {registryKey}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">컴포넌트 폰트 토큰</h4>
        <p className="text-xs text-gray-400">
          토큰-폰트 매핑 관리 영역입니다. 오브젝트별 폰트 토큰 선택은 속성 탭에서 설정합니다.
        </p>
        <div className="space-y-2">
          {colorKeys.map((key) => (
            <label key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">{key}</span>
              <select
                value={renderConfig.componentFonts[key]}
                onChange={(event) => onUpdateComponentFont(key, event.target.value)}
                className="px-2 py-1 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
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
      </div>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-sm text-gray-200">폰트 레지스트리</h4>
          <button
            type="button"
            onClick={onAddFontRegistryItem}
            className="rounded border border-[#4f8cff] bg-[#1a2c4f] px-2 py-1 text-[11px] font-semibold text-blue-200 hover:bg-[#1f3661]"
          >
            + 폰트 추가
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Webfont URL(`src`)을 입력하면 `@font-face`로 자동 주입됩니다.
        </p>

        {fontRegistryKeys.length === 0 ? (
          <p className="text-xs text-gray-500">등록된 폰트가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {fontRegistryKeys.map((registryKey) => {
              const item = renderConfig.fonts.registry[registryKey];
              if (!item) return null;

              return (
                <div
                  key={registryKey}
                  className="rounded border border-[#3a3d44] bg-[#111317] p-2 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-200">
                        {item.family || registryKey}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFontFaceCssEditorOpenByKey((prev) => ({
                            ...prev,
                            [registryKey]: !prev[registryKey],
                          }))
                        }
                        className="rounded border border-[#4f8cff] bg-[#1f355f] px-2 py-1 text-[11px] font-semibold text-[#d6e6ff] hover:bg-[#27457a]"
                      >
                        {fontFaceCssEditorOpenByKey[registryKey] ? "수정 닫기" : "수정"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveFontRegistryItem(registryKey)}
                        className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        폰트 삭제
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    font key는 `font-family`와 동일하게 자동 동기화됩니다.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={item.family}
                      onChange={(event) =>
                        onUpdateFontRegistryMeta(registryKey, {
                          family: event.target.value,
                        })
                      }
                      onBlur={() => commitFontFamilyKeySync(registryKey)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        commitFontFamilyKeySync(registryKey);
                      }}
                      className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                      placeholder="font-family"
                    />
                    <select
                      value={item.display ?? "swap"}
                      onChange={(event) =>
                        onUpdateFontRegistryMeta(registryKey, {
                          display: event.target.value as V2TemplateFontRegistryItem["display"],
                        })
                      }
                      className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                    >
                      {fontDisplayOptions.map((option) => (
                        <option key={option} value={option}>
                          display: {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {fontFaceCssEditorOpenByKey[registryKey] ? (
                    <div className="rounded border border-[#2f3239] bg-[#171a22] p-2 space-y-2">
                      <textarea
                        rows={4}
                        value={fontFaceCssDraftByKey[registryKey] ?? ""}
                        onChange={(event) =>
                          setFontFaceCssDraftByKey((prev) => ({
                            ...prev,
                            [registryKey]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (!(event.metaKey || event.ctrlKey)) return;
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          applyFontFaceCssInput(registryKey);
                        }}
                        className="w-full px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                        placeholder={`@font-face {\n  font-family: 'MyFont';\n  src: url('https://.../font.woff2') format('woff2');\n  font-weight: 400;\n  font-style: normal;\n  font-display: swap;\n}`}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyFontFaceCssInput(registryKey)}
                          className="rounded border border-[#4f8cff] bg-[#1f355f] px-2 py-1 text-[11px] font-semibold text-[#d6e6ff] hover:bg-[#27457a]"
                        >
                          적용
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFontFaceCssEditorOpenByKey((prev) => ({
                              ...prev,
                              [registryKey]: false,
                            }))
                          }
                          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-[#323640]"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {item.faces.map((face, faceIndex) => (
                      <div
                        key={`${registryKey}-face-${faceIndex}`}
                        className="rounded border border-[#2f3239] bg-[#171a22] p-2 space-y-2"
                      >
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                          <input
                            value={String(face.weight)}
                            onChange={(event) =>
                              onUpdateFontFace(registryKey, faceIndex, {
                                weight: parseFontWeightInput(event.target.value),
                              })
                            }
                            className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                            placeholder="weight (e.g. 400)"
                          />
                          <select
                            value={face.style ?? "normal"}
                            onChange={(event) =>
                              onUpdateFontFace(registryKey, faceIndex, {
                                style: event.target.value as V2TemplateFontFaceSource["style"],
                              })
                            }
                            className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                          >
                            {fontStyleOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select
                            value={face.format ?? "woff2"}
                            onChange={(event) =>
                              onUpdateFontFace(registryKey, faceIndex, {
                                format: event.target.value as V2TemplateFontFaceSource["format"],
                              })
                            }
                            className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                          >
                            {fontFormatOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => onRemoveFontFace(registryKey, faceIndex)}
                            className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            disabled={item.faces.length <= 1}
                          >
                            삭제
                          </button>
                        </div>

                        <input
                          value={face.src}
                          onChange={(event) =>
                            onUpdateFontFace(registryKey, faceIndex, {
                              src: event.target.value,
                            })
                          }
                          className="w-full px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                          placeholder="https://.../font.woff2"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddFontFace(registryKey)}
                    className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1 text-[11px] font-semibold text-gray-100 hover:bg-[#323640]"
                  >
                    + Face 추가
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default TemplateStyleThemeSettings;
