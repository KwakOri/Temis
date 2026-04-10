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
  onUpdateDayLabelMode: (mode: "preset" | "custom") => void;
  onUpdateDayLabelPreset: (preset: "kr" | "en" | "jp") => void;
  onUpdateDayLabelCustomLabel: (dayKey: V2TemplateDayKey, value: string) => void;
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
  onUpdateFontRegistryMeta,
  onAddFontFace,
  onUpdateFontFace,
  onRemoveFontFace,
  parseFontWeightInput,
  onUpdateDayLabelMode,
  onUpdateDayLabelPreset,
  onUpdateDayLabelCustomLabel,
}) => {
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
        <h4 className="font-semibold text-sm text-gray-200">요일 라벨 포맷</h4>
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">모드</label>
          <select
            value={renderConfig.dayLabelFormat.mode}
            onChange={(event) =>
              onUpdateDayLabelMode(event.target.value as "preset" | "custom")
            }
            className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
          >
            <option value="preset">preset</option>
            <option value="custom">custom</option>
          </select>
          <label className="text-xs text-gray-400">프리셋</label>
          <select
            value={renderConfig.dayLabelFormat.preset}
            onChange={(event) =>
              onUpdateDayLabelPreset(event.target.value as "kr" | "en" | "jp")
            }
            className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
          >
            <option value="kr">kr</option>
            <option value="en">en</option>
            <option value="jp">jp</option>
          </select>
        </div>
        {renderConfig.dayLabelFormat.mode === "custom" ? (
          <div className="space-y-2">
            {dayKeyOptions.map((option) => (
              <label
                key={`day-label-custom-${option.value}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-gray-400 min-w-20">{option.value}</span>
                <input
                  value={renderConfig.dayLabelFormat.custom[option.value] ?? ""}
                  onChange={(event) =>
                    onUpdateDayLabelCustomLabel(option.value, event.target.value)
                  }
                  placeholder={option.label}
                  className="min-w-0 flex-1 px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            custom 모드에서 요일별 라벨을 직접 입력할 수 있습니다.
          </p>
        )}
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
                    <div>
                      <p className="text-xs font-semibold text-gray-200">{registryKey}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveFontRegistryItem(registryKey)}
                      className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
                    >
                      폰트 삭제
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={item.family}
                      onChange={(event) =>
                        onUpdateFontRegistryMeta(registryKey, {
                          family: event.target.value,
                        })
                      }
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
