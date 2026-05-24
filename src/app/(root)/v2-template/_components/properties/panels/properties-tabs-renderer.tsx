"use client";

import React from "react";
import { createPortal } from "react-dom";

import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  V2TemplateBuiltinAssetKey,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_resolveStructureCapabilities } from "@/utils/v2/template-render-config";
import TemplateAssetsTab from "./template-assets-tab";
import TemplateBuilderTabContentRouter, {
  V2BuilderTabId,
} from "./template-builder-tab-content-router";
import TemplateCanvasTab from "./template-canvas-tab";
import TemplateDataTab from "./template-data-tab";
import TemplateExportTab from "./template-export-tab";
import TemplateSchemaTab from "./template-schema-tab";

type V2TemplateCardAssetModeKey = "online" | "offline" | "multi" | "offlineMemo";
type V2TemplateCardAssetMode = "common" | "byDay";

interface TemplatePropertiesTabsRendererProps {
  activeTab: V2BuilderTabId;
  renderConfig: V2TemplateRenderConfig;
  currentTheme: string;
  isMultiple: boolean;
  maxStreamingTimeByDay: number;
  themeOptions: string[];
  assetTheme: string;
  setAssetTheme: (theme: string) => void;
  preferProfileDummyImage: boolean;
  formSchemaError: string | null;
  formSchemaDiagnostics: React.ComponentProps<typeof TemplateSchemaTab>["diagnostics"];
  copyState: "idle" | "success" | "error";
  entryValues: Record<string, unknown>;
  entryCount: number;
  selectedEntryIndex: number;
  maxEntryCount: number;
  cardValues: Record<string, unknown>;
  globalValues: Record<string, unknown>;
  isOffline: boolean;
  fields: V2TemplateFormField[];
  computedKeys: readonly string[];
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  typeOptions: Array<{ value: V2TemplateFormField["type"]; label: string }>;
  assetKeys: V2TemplateBuiltinAssetKey[];
  assetLabels: Record<V2TemplateBuiltinAssetKey, string>;
  extraAssetKeys: string[];
  renderStyleTab: () => React.ReactNode;
  renderPropertiesTab: () => React.ReactNode;
  onUpdateTemplateSize: (key: "width" | "height", value: number) => void;
  onChangeDefaultTheme: (theme: string) => void;
  onChangePreviewTheme: (theme: string) => void;
  onToggleMultiple: (value: boolean) => void;
  onChangeMaxStreamingTimeByDay: (value: number) => void;
  onChangeCardAssetMode: (
    key: V2TemplateCardAssetModeKey,
    mode: V2TemplateCardAssetMode
  ) => void;
  onApplyEntryCountVisibilityPreset: () => void;
  onAutoGenerateEntryCountNodes: () => void;
  onAppendSchemaField: () => void;
  onRemoveSchemaField: (index: number) => void;
  onUpdateSchemaField: (
    index: number,
    patch: Partial<V2TemplateFormField>
  ) => void;
  onTogglePreferProfileDummyImage: (value: boolean) => void;
  onUploadAssetFile: (
    key: V2TemplateBuiltinAssetKey,
    theme: string,
    file: File | null
  ) => void;
  onResetAsset: (key: V2TemplateBuiltinAssetKey, theme: string) => void;
  onCreateExtraAssetKey: (key: string) => void;
  onRemoveExtraAssetKey: (key: string) => void;
  onUploadExtraAssetFile: (key: string, theme: string, file: File | null) => void;
  onResetExtraAsset: (key: string, theme: string) => void;
  onUploadBulkAssetFiles: (params: {
    theme: string;
    items: Array<{
      clientId: string;
      file: File;
      targetType: "builtin" | "extra";
      targetKey: string;
    }>;
  }) => Promise<void>;
  onChangeDataField: (
    scope: "entry" | "card" | "global",
    key: string,
    value: string | number
  ) => void;
  onToggleOffline: (value: boolean) => void;
  onSelectEntryIndex: (index: number) => void;
  onAddEntry: () => void;
  onRemoveEntry: (index: number) => void;
  onCopyJson: () => void;
  onDownloadPreview: () => void;
  onResetData: () => void;
}

type V2SettingsModalId =
  | "template"
  | "style"
  | "schema"
  | "assets"
  | "data"
  | "export"
  | "figmaImport";

const v2_SETTINGS_MODAL_OPTIONS: Array<{
  id: V2SettingsModalId;
  label: string;
  description: string;
}> = [
  {
    id: "template",
    label: "템플릿 설정",
    description: "캔버스 크기/기본 테마/다회차 옵션",
  },
  {
    id: "style",
    label: "스타일",
    description: "테마/폰트/컬러와 기본 스타일 세팅",
  },
  {
    id: "schema",
    label: "입력 스키마",
    description: "사용자 입력 필드 구조 정의",
  },
  {
    id: "assets",
    label: "에셋",
    description: "배경/카드/프로필/가이드 이미지 관리",
  },
  {
    id: "data",
    label: "샘플 데이터",
    description: "프리뷰 확인용 샘플 값 편집",
  },
  {
    id: "export",
    label: "내보내기",
    description: "JSON 복사/이미지 다운로드/초기화",
  },
];

const v2_FIGMA_IMPORT_SETTINGS_OPTION: {
  id: V2SettingsModalId;
  label: string;
  description: string;
} = {
  id: "figmaImport",
  label: "Figma import",
  description: "Figma 링크로 현재 템플릿 세팅",
};

const TemplatePropertiesTabsRenderer: React.FC<
  TemplatePropertiesTabsRendererProps
> = ({
  activeTab,
  renderConfig,
  currentTheme,
  isMultiple,
  maxStreamingTimeByDay,
  themeOptions,
  assetTheme,
  setAssetTheme,
  preferProfileDummyImage,
  formSchemaError,
  formSchemaDiagnostics,
  copyState,
  entryValues,
  entryCount,
  selectedEntryIndex,
  maxEntryCount,
  cardValues,
  globalValues,
  isOffline,
  fields,
  computedKeys,
  scopeOptions,
  typeOptions,
  assetKeys,
  assetLabels,
  extraAssetKeys,
  renderStyleTab,
  renderPropertiesTab,
  onUpdateTemplateSize,
  onChangeDefaultTheme,
  onChangePreviewTheme,
  onToggleMultiple,
  onChangeMaxStreamingTimeByDay,
  onChangeCardAssetMode,
  onApplyEntryCountVisibilityPreset,
  onAutoGenerateEntryCountNodes,
  onAppendSchemaField,
  onRemoveSchemaField,
  onUpdateSchemaField,
  onTogglePreferProfileDummyImage,
  onUploadAssetFile,
  onResetAsset,
  onCreateExtraAssetKey,
  onRemoveExtraAssetKey,
  onUploadExtraAssetFile,
  onResetExtraAsset,
  onUploadBulkAssetFiles,
  onChangeDataField,
  onToggleOffline,
  onSelectEntryIndex,
  onAddEntry,
  onRemoveEntry,
  onCopyJson,
  onDownloadPreview,
  onResetData,
}) => {
  const { figmaImport } = useTemplateRenderConfigContext();
  const [openSettingsModalId, setOpenSettingsModalId] =
    React.useState<V2SettingsModalId | null>(null);
  const [isClientMounted, setIsClientMounted] = React.useState(false);

  const settingsModalOptions = React.useMemo(
    () =>
      figmaImport
        ? [...v2_SETTINGS_MODAL_OPTIONS, v2_FIGMA_IMPORT_SETTINGS_OPTION]
        : v2_SETTINGS_MODAL_OPTIONS,
    [figmaImport]
  );

  React.useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const renderTemplateTab = () => {
    const capabilities = v2_resolveStructureCapabilities(renderConfig);
    const cardAssetModes: Record<
      V2TemplateCardAssetModeKey,
      V2TemplateCardAssetMode
    > = {
      online: renderConfig.editorOptions.useOnlineAssetsByDay ? "byDay" : "common",
      offline: renderConfig.editorOptions.useOfflineAssetsByDay
        ? "byDay"
        : "common",
      multi: renderConfig.editorOptions.useMultiAssetsByDay ? "byDay" : "common",
      offlineMemo: renderConfig.editorOptions.useOfflineMemoAssetsByDay
        ? "byDay"
        : "common",
    };

    return (
      <TemplateCanvasTab
        templateWidth={renderConfig.templateSize.width}
        templateHeight={renderConfig.templateSize.height}
        defaultTheme={renderConfig.defaultTheme}
        previewTheme={currentTheme}
        themeOptions={themeOptions}
        isMultiple={isMultiple}
        offlineMemoEnabled={capabilities.timetable.offlineMemoEnabled}
        maxStreamingTimeByDay={maxStreamingTimeByDay}
        cardAssetModes={cardAssetModes}
        onUpdateTemplateSize={onUpdateTemplateSize}
        onChangeDefaultTheme={onChangeDefaultTheme}
        onChangePreviewTheme={onChangePreviewTheme}
        onToggleMultiple={onToggleMultiple}
        onChangeMaxStreamingTimeByDay={onChangeMaxStreamingTimeByDay}
        onChangeCardAssetMode={onChangeCardAssetMode}
        onApplyEntryCountVisibilityPreset={onApplyEntryCountVisibilityPreset}
        onAutoGenerateEntryCountNodes={onAutoGenerateEntryCountNodes}
      />
    );
  };

  const renderSchemaTab = () => (
    <TemplateSchemaTab
      formSchemaError={formSchemaError}
      diagnostics={formSchemaDiagnostics}
      fields={fields}
      computedKeys={computedKeys}
      scopeOptions={scopeOptions}
      typeOptions={typeOptions}
      onAppendField={onAppendSchemaField}
      onRemoveField={onRemoveSchemaField}
      onUpdateField={onUpdateSchemaField}
    />
  );

  const renderAssetsTab = () => (
    <TemplateAssetsTab
      assetTheme={assetTheme}
      themeOptions={themeOptions}
      renderConfig={renderConfig}
      preferProfileDummyImage={preferProfileDummyImage}
      assetKeys={assetKeys}
      assetLabels={assetLabels}
      extraAssetKeys={extraAssetKeys}
      setAssetTheme={setAssetTheme}
      onTogglePreferProfileDummyImage={onTogglePreferProfileDummyImage}
      onUploadBuiltinFile={onUploadAssetFile}
      onResetBuiltinAsset={onResetAsset}
      onCreateExtraAssetKey={onCreateExtraAssetKey}
      onRemoveExtraAssetKey={onRemoveExtraAssetKey}
      onUploadExtraFile={onUploadExtraAssetFile}
      onResetExtraAsset={onResetExtraAsset}
      onUploadBulkFiles={onUploadBulkAssetFiles}
    />
  );

  const renderDataTab = () => (
    <TemplateDataTab
      fields={fields}
      entryValues={entryValues}
      entryCount={entryCount}
      selectedEntryIndex={selectedEntryIndex}
      maxEntryCount={maxEntryCount}
      cardValues={cardValues}
      globalValues={globalValues}
      isOffline={isOffline}
      onChangeField={onChangeDataField}
      onToggleOffline={onToggleOffline}
      onSelectEntryIndex={onSelectEntryIndex}
      onAddEntry={onAddEntry}
      onRemoveEntry={onRemoveEntry}
    />
  );

  const renderExportTab = () => (
    <TemplateExportTab
      copyState={copyState}
      onCopyJson={onCopyJson}
      onDownloadPreview={onDownloadPreview}
      onResetData={onResetData}
    />
  );

  const renderFigmaImportTab = () => {
    if (!figmaImport) {
      return (
        <div className="rounded border border-[#303744] bg-[#171d27] p-3 text-xs text-gray-400">
          현재 화면에서는 Figma import를 사용할 수 없습니다.
        </div>
      );
    }

    const isSubmitDisabled =
      !figmaImport.canImport ||
      figmaImport.isImporting ||
      figmaImport.rootFigmaUrl.trim().length === 0 ||
      figmaImport.pendingSettingChanges.length > 0;
    const hasPendingSettingChanges = figmaImport.pendingSettingChanges.length > 0;

    return (
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          figmaImport.importToCurrentTemplate();
        }}
      >
        <div className="rounded border border-[#303744] bg-[#171d27] p-3">
          <label className="block text-xs font-semibold text-gray-200">
            Figma 링크
          </label>
          <input
            type="url"
            value={figmaImport.rootFigmaUrl}
            onChange={(event) => figmaImport.setRootFigmaUrl(event.target.value)}
            placeholder="https://www.figma.com/design/..."
            disabled={figmaImport.isImporting}
            className="mt-2 w-full rounded border border-[#3c465e] bg-[#111722] px-3 py-2 text-xs text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4f8cff]"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded border border-[#303744] bg-[#171d27] px-3 py-2 text-xs text-gray-200">
          <input
            type="checkbox"
            checked={figmaImport.withAssets}
            onChange={(event) => figmaImport.setWithAssets(event.target.checked)}
            disabled={figmaImport.isImporting}
            className="h-4 w-4 rounded border-[#3c465e] bg-[#111722]"
          />
          <span>이미지 에셋 포함</span>
        </label>

        {hasPendingSettingChanges ? (
          <div className="space-y-3 rounded border border-amber-400/45 bg-amber-400/10 p-3">
            <div>
              <p className="text-xs font-semibold text-amber-100">
                템플릿 설정 확인 필요
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-50/80">
                현재 템플릿 기능 설정과 Figma에서 감지된 구조가 다릅니다.
              </p>
            </div>
            <div className="space-y-2">
              {figmaImport.pendingSettingChanges.map((change) => (
                <div
                  key={change.key}
                  className="rounded border border-amber-300/30 bg-[#141821] px-3 py-2"
                >
                  <p className="text-xs font-semibold text-gray-100">
                    {change.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-gray-300">
                    {change.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={figmaImport.confirmPendingImport}
                disabled={figmaImport.isImporting}
                className="rounded border border-amber-300/60 bg-amber-300/20 px-3 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                설정 반영하고 적용
              </button>
              <button
                type="button"
                onClick={figmaImport.cancelPendingImport}
                disabled={figmaImport.isImporting}
                className="rounded border border-[#3c465e] bg-[#151a24] px-3 py-2 text-xs font-semibold text-[#c9d8f8] hover:bg-[#1c2533] disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="rounded border border-[#4f8cff] bg-[#244c92] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2d5cb0] disabled:cursor-not-allowed disabled:border-[#303744] disabled:bg-[#171d27] disabled:text-gray-500"
          >
            {figmaImport.isImporting
              ? "분석 중..."
              : hasPendingSettingChanges
                ? "확인 대기 중"
                : "현재 템플릿에 적용"}
          </button>
          <button
            type="button"
            onClick={figmaImport.reset}
            disabled={figmaImport.isImporting}
            className="rounded border border-[#3c465e] bg-[#151a24] px-3 py-2 text-xs font-semibold text-[#c9d8f8] hover:bg-[#1c2533] disabled:cursor-not-allowed disabled:opacity-60"
          >
            초기화
          </button>
        </div>

        {figmaImport.message ? (
          <p className="rounded border border-[#303744] bg-[#111722] px-3 py-2 text-xs leading-5 text-gray-300">
            {figmaImport.message}
          </p>
        ) : null}
      </form>
    );
  };

  const renderSettingsModalContent = () => {
    if (openSettingsModalId === "template") return renderTemplateTab();
    if (openSettingsModalId === "style") return <>{renderStyleTab()}</>;
    if (openSettingsModalId === "schema") return renderSchemaTab();
    if (openSettingsModalId === "assets") return renderAssetsTab();
    if (openSettingsModalId === "data") return renderDataTab();
    if (openSettingsModalId === "export") return renderExportTab();
    if (openSettingsModalId === "figmaImport") return renderFigmaImportTab();
    return null;
  };

  const openSettingsModal = (id: V2SettingsModalId) => {
    setOpenSettingsModalId(id);
  };

  const closeSettingsModal = () => {
    setOpenSettingsModalId(null);
  };

  React.useEffect(() => {
    if (!openSettingsModalId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeSettingsModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openSettingsModalId]);

  const settingsModalOverlay =
    isClientMounted && openSettingsModalId
      ? createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target !== event.currentTarget) return;
              closeSettingsModal();
            }}
          >
            <div className="flex h-[86vh] w-full max-w-[1180px] overflow-hidden rounded-xl border border-[#3a3d44] bg-[#0f131a] shadow-2xl">
              <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#2f3746] bg-[#0d1118] md:flex">
                <div className="border-b border-[#2f3746] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea3c7]">
                    설정 메뉴
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {settingsModalOptions.map((option) => {
                      const active = option.id === openSettingsModalId;
                      return (
                        <button
                          key={`settings-modal-nav-${option.id}`}
                          type="button"
                          onClick={() => openSettingsModal(option.id)}
                          className={`w-full rounded border px-3 py-2 text-left transition ${
                            active
                              ? "border-[#4f8cff] bg-[#1f355f] text-[#d6e6ff]"
                              : "border-[#303744] bg-[#171d27] text-gray-200 hover:bg-[#1f2733]"
                          }`}
                        >
                          <p className="text-xs font-semibold">{option.label}</p>
                          <p className="mt-1 text-[11px] text-inherit/80">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-[#2f3746] px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-100">
                    {
                      settingsModalOptions.find(
                        (option) => option.id === openSettingsModalId
                      )?.label
                    }
                  </h4>
                  <button
                    type="button"
                    onClick={closeSettingsModal}
                    className="rounded border border-[#3c465e] bg-[#151a24] px-2 py-1 text-xs font-semibold text-[#c9d8f8] hover:bg-[#1c2533]"
                  >
                    닫기
                  </button>
                </div>

                <div className="border-b border-[#263040] px-4 py-2 md:hidden">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {settingsModalOptions.map((option) => {
                      const active = option.id === openSettingsModalId;
                      return (
                        <button
                          key={`settings-modal-nav-mobile-${option.id}`}
                          type="button"
                          onClick={() => openSettingsModal(option.id)}
                          className={`whitespace-nowrap rounded border px-2.5 py-1 text-xs font-semibold ${
                            active
                              ? "border-[#4f8cff] bg-[#1f355f] text-[#d6e6ff]"
                              : "border-[#303744] bg-[#171d27] text-gray-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-b border-[#263040] px-4 py-2">
                  <p className="text-xs text-gray-400">
                    {
                      settingsModalOptions.find(
                        (option) => option.id === openSettingsModalId
                      )?.description
                    }
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {renderSettingsModalContent()}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const renderSettingsTab = () => (
    <div className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100">
      <h3 className="font-bold text-base text-gray-100">설정</h3>
      <p className="text-xs text-gray-400">
        편집 중 자주 변경하는 값은 `속성` 탭에서 관리하고, 그 외 설정은 아래
        버튼에서 오버레이 창으로 열어 편집합니다.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {settingsModalOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => openSettingsModal(option.id)}
            className="rounded border border-[#3a3d44] bg-[#1a1c20] px-3 py-2 text-left hover:bg-[#22252b]"
          >
            <p className="text-xs font-semibold text-gray-100">{option.label}</p>
            <p className="mt-1 text-[11px] text-gray-400">{option.description}</p>
          </button>
        ))}
      </div>
      {settingsModalOverlay}
    </div>
  );

  return (
    <TemplateBuilderTabContentRouter
      activeTab={activeTab}
      renderPropertiesTab={renderPropertiesTab}
      renderSettingsTab={renderSettingsTab}
    />
  );
};

export default TemplatePropertiesTabsRenderer;
