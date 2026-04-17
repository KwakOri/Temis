"use client";

import {
  V2TemplateBuiltinAssetKey,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_suggestAssetKeyByRule } from "@/utils/v2/asset-mapping";
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
  onUploadBulkFiles?: (params: {
    theme: string;
    items: Array<{
      clientId: string;
      file: File;
      targetType: "builtin" | "extra";
      targetKey: string;
    }>;
  }) => Promise<void>;
}

type V2BulkMatchSource = "rule" | "ai" | "none";

type V2BulkMatchRow = {
  id: string;
  file: File;
  fileName: string;
  selectedKey: string;
  source: V2BulkMatchSource;
  confidence: number;
  reason: string;
};

type V2BulkAiSuggestionResponse = {
  success: boolean;
  suggestions?: Array<{
    fileName?: string;
    key?: string | null;
    confidence?: number;
    reason?: string;
    source?: "ai" | "fallback";
  }>;
};

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
  onUploadBulkFiles,
}) => {
  const fileInputRefs = React.useRef<
    Partial<Record<V2TemplateBuiltinAssetKey, HTMLInputElement | null>>
  >({});
  const extraFileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>(
    {}
  );
  const bulkFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [newExtraAssetKey, setNewExtraAssetKey] = React.useState("");
  const [bulkMatchRows, setBulkMatchRows] = React.useState<V2BulkMatchRow[]>([]);
  const [isSuggestingBulkMatches, setIsSuggestingBulkMatches] =
    React.useState(false);
  const [isApplyingBulkMatches, setIsApplyingBulkMatches] = React.useState(false);
  const [bulkMatchError, setBulkMatchError] = React.useState<string | null>(null);
  const sortedExtraAssetKeys = React.useMemo(
    () => [...extraAssetKeys].sort((a, b) => a.localeCompare(b)),
    [extraAssetKeys]
  );
  const resolvedBuiltinAssetKeys = React.useMemo(() => [...assetKeys], [assetKeys]);
  const allAssetKeys = React.useMemo(
    () => [...resolvedBuiltinAssetKeys, ...sortedExtraAssetKeys],
    [resolvedBuiltinAssetKeys, sortedExtraAssetKeys]
  );
  const builtinAssetKeySet = React.useMemo(
    () => new Set(Object.keys(renderConfig.assets)),
    [renderConfig.assets]
  );

  const submitExtraAssetKey = () => {
    const key = newExtraAssetKey.trim();
    if (!key) return;
    onCreateExtraAssetKey(key);
    setNewExtraAssetKey("");
  };

  const handleBulkFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    setIsSuggestingBulkMatches(true);
    setBulkMatchError(null);

    try {
      const draftRows: V2BulkMatchRow[] = selectedFiles.map((file, index) => {
        const ruleMatch = v2_suggestAssetKeyByRule({
          fileName: file.name,
          candidateKeys: allAssetKeys,
        });
        return {
          id: `${file.name}-${index}`,
          file,
          fileName: file.name,
          selectedKey: ruleMatch?.key ?? "",
          source: ruleMatch ? "rule" : "none",
          confidence: ruleMatch?.confidence ?? 0,
          reason: ruleMatch?.reason ?? "규칙 매칭 실패",
        };
      });

      const unresolvedRows = draftRows.filter((row) => !row.selectedKey);
      if (unresolvedRows.length > 0) {
        const response = await fetch(
          "/api/admin/v2/templates/assets/suggest-mapping",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileNames: unresolvedRows.map((row) => row.fileName),
              candidateKeys: allAssetKeys,
            }),
          }
        );

        const result = (await response.json().catch(() => null)) as
          | V2BulkAiSuggestionResponse
          | null;
        if (!response.ok) {
          throw new Error("AI 매칭 제안 요청에 실패했습니다.");
        }

        const aiSuggestionByFileName = new Map(
          (result?.suggestions ?? []).map((item) => [item.fileName, item])
        );
        const mergedRows = draftRows.map((row) => {
          if (row.selectedKey) return row;
          const aiSuggestion = aiSuggestionByFileName.get(row.fileName);
          if (
            !aiSuggestion ||
            typeof aiSuggestion.key !== "string" ||
            !allAssetKeys.includes(aiSuggestion.key)
          ) {
            return row;
          }
          return {
            ...row,
            selectedKey: aiSuggestion.key,
            source: "ai" as const,
            confidence:
              typeof aiSuggestion.confidence === "number"
                ? Math.max(0, Math.min(1, aiSuggestion.confidence))
                : 0.5,
            reason:
              typeof aiSuggestion.reason === "string"
                ? aiSuggestion.reason
                : "AI 매칭 제안",
          };
        });
        setBulkMatchRows(mergedRows);
      } else {
        setBulkMatchRows(draftRows);
      }
    } catch (error) {
      console.error("Failed to suggest bulk asset matches", error);
      setBulkMatchError("일괄 매칭 제안 중 오류가 발생했습니다.");
      setBulkMatchRows([]);
    } finally {
      setIsSuggestingBulkMatches(false);
    }
  };

  const applyBulkMatches = async () => {
    if (bulkMatchRows.length === 0) return;
    setIsApplyingBulkMatches(true);
    setBulkMatchError(null);

    try {
      const selectedRows = bulkMatchRows.filter((row) => row.selectedKey);
      if (selectedRows.length === 0) {
        setBulkMatchError("선택된 매칭 키가 없어 적용할 항목이 없습니다.");
        return;
      }
      if (onUploadBulkFiles) {
        await onUploadBulkFiles({
          theme: assetTheme,
          items: selectedRows.map((row) => ({
            clientId: row.id,
            file: row.file,
            targetType: builtinAssetKeySet.has(row.selectedKey)
              ? "builtin"
              : "extra",
            targetKey: row.selectedKey,
          })),
        });
      } else {
        selectedRows.forEach((row) => {
          if (builtinAssetKeySet.has(row.selectedKey)) {
            onUploadBuiltinFile(
              row.selectedKey as V2TemplateBuiltinAssetKey,
              assetTheme,
              row.file
            );
            return;
          }
          onUploadExtraFile(row.selectedKey, assetTheme, row.file);
        });
      }
      setBulkMatchRows([]);
    } catch (error) {
      console.error("Failed to apply bulk asset matches", error);
      setBulkMatchError("일괄 적용 중 오류가 발생했습니다.");
    } finally {
      setIsApplyingBulkMatches(false);
    }
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

      <div className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <h4 className="text-sm font-semibold text-gray-200">카드 배경 상태 저장 구조</h4>
        <p className="text-[11px] text-gray-400">
          카드 배경은 `online/multi/offline/offlineMemo x 7요일`(총 28개)로 개별 저장됩니다.
          런타임 UI는 온라인/오프라인 기본 흐름을 유지하되, 자산 데이터는 상태별로 분리 관리됩니다.
        </p>
      </div>

      <div className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <h4 className="text-sm font-semibold text-gray-200">
          일괄 업로드 · 자동 매칭(검토 후 적용)
        </h4>
        <p className="text-[11px] text-gray-400">
          파일명을 기준으로 먼저 규칙 매칭하고, 실패한 항목은 AI 추천을 받아
          사람이 확인 후 적용합니다. 현재 선택된 테마(`{assetTheme}`)에만
          업로드됩니다.
        </p>

        <input
          ref={bulkFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void handleBulkFilesSelected(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSuggestingBulkMatches}
            onClick={() => bulkFileInputRef.current?.click()}
            className="rounded border border-[#4f8cff] bg-[#1f355f] px-3 py-2 text-xs font-semibold text-[#d6e6ff] hover:bg-[#27457a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSuggestingBulkMatches ? "분석 중..." : "이미지 여러개 선택"}
          </button>
          <button
            type="button"
            disabled={bulkMatchRows.length === 0 || isApplyingBulkMatches}
            onClick={() => void applyBulkMatches()}
            className="rounded border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplyingBulkMatches ? "적용 중..." : "검토한 매칭 일괄 적용"}
          </button>
          <button
            type="button"
            disabled={bulkMatchRows.length === 0 || isApplyingBulkMatches}
            onClick={() => {
              setBulkMatchRows([]);
              setBulkMatchError(null);
            }}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-[#323640] disabled:cursor-not-allowed disabled:opacity-60"
          >
            목록 지우기
          </button>
        </div>

        {bulkMatchError ? (
          <p className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
            {bulkMatchError}
          </p>
        ) : null}

        {bulkMatchRows.length > 0 ? (
          <div className="max-h-[320px] overflow-auto rounded border border-[#3a3d44]">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#131722] text-gray-300">
                <tr>
                  <th className="border-b border-[#3a3d44] px-2 py-2 text-left">
                    파일명
                  </th>
                  <th className="border-b border-[#3a3d44] px-2 py-2 text-left">
                    추천 소스
                  </th>
                  <th className="border-b border-[#3a3d44] px-2 py-2 text-left">
                    매칭 키(검토)
                  </th>
                </tr>
              </thead>
              <tbody>
                {bulkMatchRows.map((row, index) => (
                  <tr key={row.id} className="bg-[#11151f] text-gray-200">
                    <td className="border-b border-[#2c3140] px-2 py-2 align-top">
                      <p className="break-all">{row.fileName}</p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {row.reason}
                        {row.confidence > 0
                          ? ` (confidence ${(row.confidence * 100).toFixed(0)}%)`
                          : ""}
                      </p>
                    </td>
                    <td className="border-b border-[#2c3140] px-2 py-2 align-top">
                      <span
                        className={`inline-flex rounded border px-1.5 py-0.5 ${
                          row.source === "rule"
                            ? "border-blue-400/50 bg-blue-500/15 text-blue-200"
                            : row.source === "ai"
                              ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                              : "border-gray-500/40 bg-gray-500/15 text-gray-300"
                        }`}
                      >
                        {row.source === "rule"
                          ? "규칙"
                          : row.source === "ai"
                            ? "AI"
                            : "미매칭"}
                      </span>
                    </td>
                    <td className="border-b border-[#2c3140] px-2 py-2 align-top">
                      <select
                        value={row.selectedKey}
                        onChange={(event) => {
                          const nextKey = event.target.value;
                          setBulkMatchRows((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    selectedKey: nextKey,
                                    source: nextKey ? item.source : "none",
                                  }
                                : item
                            )
                          );
                        }}
                        className="w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-[11px] text-gray-100"
                      >
                        <option value="">(수동 선택 필요)</option>
                        {allAssetKeys.map((key) => (
                          <option key={`${row.id}-${key}`} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded border border-[#3a3d44] bg-[#111317] px-3 py-2 text-[11px] text-gray-400">
            여러 이미지를 선택하면 자동 매칭 결과가 여기에 표시됩니다.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-200">기본 에셋</h4>
        {resolvedBuiltinAssetKeys.map((key) => {
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
              {key === "artist" ? (
                <p className="text-[11px] text-blue-300">
                  Artist 그룹의 `ArtistObject` 노드에 연결되는 배경 에셋입니다.
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
