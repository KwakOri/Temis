"use client";

import { V2TemplateAssetMap, V2TemplateRenderConfig } from "@/types/time-table/template-render-config";
import React from "react";

interface TemplateAssetsTabProps {
  assetTheme: string;
  themeOptions: string[];
  renderConfig: V2TemplateRenderConfig;
  assetKeys: Array<keyof V2TemplateAssetMap>;
  assetLabels: Record<keyof V2TemplateAssetMap, string>;
  setAssetTheme: (theme: string) => void;
  onUploadFile: (
    key: keyof V2TemplateAssetMap,
    theme: string,
    file: File | null
  ) => void;
  onResetAsset: (key: keyof V2TemplateAssetMap, theme: string) => void;
}

const TemplateAssetsTab: React.FC<TemplateAssetsTabProps> = ({
  assetTheme,
  themeOptions,
  renderConfig,
  assetKeys,
  assetLabels,
  setAssetTheme,
  onUploadFile,
  onResetAsset,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">에셋 파일</h3>

      <div className="grid grid-cols-2 items-center gap-2">
        <label className="text-xs text-gray-500">theme</label>
        <select
          value={assetTheme}
          onChange={(event) => setAssetTheme(event.target.value)}
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
        {assetKeys.map((key) => {
          const inputId = `v2-asset-upload-${key}-${assetTheme}`;
          const assetUrl = renderConfig.assets[key][assetTheme];
          const assetSize = renderConfig.assetDimensions[key][assetTheme];

          return (
            <div
              key={key}
              className="rounded border border-gray-300 bg-white p-3 space-y-2"
            >
              <p className="text-xs text-gray-500">{assetLabels[key]}</p>
              {key === "guideByTheme" ? (
                <p className="text-[11px] text-blue-600">
                  편집 시 프리뷰 최상단에 오버레이로 표시됩니다.
                </p>
              ) : null}

              <input
                id={inputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  onUploadFile(
                    key,
                    assetTheme,
                    event.target.files?.[0] ?? null
                  )
                }
              />

              <div className="flex items-center gap-2">
                <label
                  htmlFor={inputId}
                  className="inline-flex cursor-pointer items-center justify-center rounded border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  파일 선택
                </label>
                <button
                  type="button"
                  onClick={() => onResetAsset(key, assetTheme)}
                  className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  초기화
                </button>
              </div>

              <p className="text-[11px] text-gray-500 break-all">
                {assetUrl ? "업로드 완료" : "선택된 파일 없음"}
              </p>
              {assetSize ? (
                <p className="text-[11px] text-emerald-700">
                  size: {assetSize.width} x {assetSize.height}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateAssetsTab;
