"use client";

import {
  V2TemplateBuiltinAssetKey,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import React from "react";

interface TemplateAssetsTabProps {
  assetTheme: string;
  themeOptions: string[];
  renderConfig: V2TemplateRenderConfig;
  preferProfileDummyImage: boolean;
  assetKeys: V2TemplateBuiltinAssetKey[];
  assetLabels: Record<V2TemplateBuiltinAssetKey, string>;
  extraAssetKeys: string[];
  setAssetTheme: (theme: string) => void;
  onTogglePreferProfileDummyImage: (value: boolean) => void;
  onUploadBuiltinFile: (
    key: V2TemplateBuiltinAssetKey,
    theme: string,
    file: File | null
  ) => void;
  onResetBuiltinAsset: (key: V2TemplateBuiltinAssetKey, theme: string) => void;
  onCreateExtraAssetKey: (key: string) => void;
  onRemoveExtraAssetKey: (key: string) => void;
  onUploadExtraFile: (key: string, theme: string, file: File | null) => void;
  onResetExtraAsset: (key: string, theme: string) => void;
}

const TemplateAssetsTab: React.FC<TemplateAssetsTabProps> = ({
  assetTheme,
  themeOptions,
  renderConfig,
  preferProfileDummyImage,
  assetKeys,
  assetLabels,
  extraAssetKeys,
  setAssetTheme,
  onTogglePreferProfileDummyImage,
  onUploadBuiltinFile,
  onResetBuiltinAsset,
  onCreateExtraAssetKey,
  onRemoveExtraAssetKey,
  onUploadExtraFile,
  onResetExtraAsset,
}) => {
  const fileInputRefs = React.useRef<
    Partial<Record<V2TemplateBuiltinAssetKey, HTMLInputElement | null>>
  >({});
  const extraFileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>(
    {}
  );
  const [newExtraAssetKey, setNewExtraAssetKey] = React.useState("");
  const sortedExtraAssetKeys = React.useMemo(
    () => [...extraAssetKeys].sort((a, b) => a.localeCompare(b)),
    [extraAssetKeys]
  );

  const submitExtraAssetKey = () => {
    const key = newExtraAssetKey.trim();
    if (!key) return;
    onCreateExtraAssetKey(key);
    setNewExtraAssetKey("");
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100">
      <h3 className="font-bold text-base text-gray-100">에셋</h3>
      <p className="text-xs text-gray-400">
        테마별 이미지 에셋을 업로드/초기화합니다. 등록한 이미지 크기는 자동으로
        저장됩니다.
      </p>

      <div className="grid grid-cols-[120px_1fr] items-center gap-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <label className="text-xs text-gray-400">테마</label>
        <select
          value={assetTheme}
          onChange={(event) => setAssetTheme(event.target.value)}
          className="px-3 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center justify-between gap-2 rounded border border-[#3a3d44] bg-[#1a1c20] px-3 py-2">
        <span className="text-xs text-gray-300">
          편집 시 프로필 더미 이미지 우선 표시
        </span>
        <input
          type="checkbox"
          checked={preferProfileDummyImage}
          onChange={(event) =>
            onTogglePreferProfileDummyImage(event.target.checked)
          }
        />
      </label>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-200">기본 에셋</h4>
        {assetKeys.map((key) => {
          const inputId = `v2-asset-upload-${key}-${assetTheme}`;
          const assetUrl = renderConfig.assets[key][assetTheme];
          const assetSize = renderConfig.assetDimensions[key][assetTheme];

          return (
            <div
              key={key}
              className="rounded border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-200">
                  {assetLabels[key]}
                </p>
                <span
                  className={`rounded border px-2 py-0.5 text-[11px] ${
                    assetUrl
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-[#3a3d44] bg-[#111317] text-gray-400"
                  }`}
                >
                  {assetUrl ? "업로드 완료" : "파일 없음"}
                </span>
              </div>

              <input
                id={inputId}
                type="file"
                accept="image/*"
                className="sr-only"
                ref={(element) => {
                  fileInputRefs.current[key] = element;
                }}
                onChange={(event) =>
                  onUploadBuiltinFile(
                    key,
                    assetTheme,
                    event.target.files?.[0] ?? null
                  )
                }
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[key]?.click()}
                  className="inline-flex cursor-pointer items-center justify-center rounded border border-[#4f8cff] bg-[#1f355f] px-3 py-2 text-xs font-semibold text-[#d6e6ff] hover:bg-[#27457a]"
                >
                  파일 선택
                </button>
                <button
                  type="button"
                  onClick={() => onResetBuiltinAsset(key, assetTheme)}
                  className="inline-flex items-center justify-center rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-[#323640]"
                >
                  초기화
                </button>
              </div>

              {key === "guideByTheme" ? (
                <p className="text-[11px] text-blue-300">
                  편집 시 프리뷰 최상단에 오버레이로 표시됩니다.
                </p>
              ) : null}
              {key === "profileBgByTheme" ? (
                <p className="text-[11px] text-blue-300">
                  사용자 프로필 이미지를 업로드하지 않은 상태에서 프리뷰에 표시될
                  더미 이미지입니다.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <p className="text-gray-500 break-all">
                  {assetUrl ? "테마 에셋이 저장되었습니다." : "선택된 파일 없음"}
                </p>
                {assetSize ? (
                  <p className="text-emerald-300">
                    size: {assetSize.width} x {assetSize.height}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <h4 className="text-sm font-semibold text-gray-200">추가 요소 에셋</h4>
        <p className="text-[11px] text-gray-400">
          고정 스키마 외에 자유 오브젝트용 이미지 키를 추가하고 테마별 파일을 관리합니다.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={newExtraAssetKey}
            onChange={(event) => setNewExtraAssetKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              submitExtraAssetKey();
            }}
            placeholder="예: stickerHeart"
            className="min-w-0 flex-1 rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2 text-sm text-gray-100"
          />
          <button
            type="button"
            onClick={submitExtraAssetKey}
            className="shrink-0 rounded border border-[#4f8cff] bg-[#1f355f] px-3 py-2 text-xs font-semibold text-[#d6e6ff] hover:bg-[#27457a]"
          >
            키 추가
          </button>
        </div>

        {sortedExtraAssetKeys.length === 0 ? (
          <p className="rounded border border-[#3a3d44] bg-[#111317] px-3 py-2 text-[11px] text-gray-400">
            아직 추가 요소 에셋 키가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedExtraAssetKeys.map((key) => {
              const inputId = `v2-extra-asset-upload-${key}-${assetTheme}`;
              const assetUrl = renderConfig.extraAssets[key]?.[assetTheme] ?? null;
              const assetSize =
                renderConfig.extraAssetDimensions[key]?.[assetTheme] ?? null;

              return (
                <div
                  key={`extra-asset-${key}`}
                  className="rounded border border-[#3a3d44] bg-[#14161c] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-200 break-all">{key}</p>
                    <button
                      type="button"
                      onClick={() => onRemoveExtraAssetKey(key)}
                      className="shrink-0 rounded border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20"
                    >
                      키 삭제
                    </button>
                  </div>

                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    ref={(element) => {
                      extraFileInputRefs.current[key] = element;
                    }}
                    onChange={(event) =>
                      onUploadExtraFile(
                        key,
                        assetTheme,
                        event.target.files?.[0] ?? null
                      )
                    }
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => extraFileInputRefs.current[key]?.click()}
                      className="rounded border border-[#4f8cff] bg-[#1f355f] px-3 py-2 text-xs font-semibold text-[#d6e6ff] hover:bg-[#27457a]"
                    >
                      파일 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetExtraAsset(key, assetTheme)}
                      className="rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-[#323640]"
                    >
                      초기화
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <p className="text-gray-400 break-all">
                      {assetUrl ? "테마 에셋이 저장되었습니다." : "선택된 파일 없음"}
                    </p>
                    {assetSize ? (
                      <p className="text-emerald-300">
                        size: {assetSize.width} x {assetSize.height}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateAssetsTab;
