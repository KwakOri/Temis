"use client";

import React from "react";

import {
  V2TemplateAssetMap,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import TemplateAssetsTab from "./template-assets-tab";
import TemplateBuilderTabContentRouter, {
  V2BuilderTabId,
} from "./template-builder-tab-content-router";
import TemplateCanvasTab from "./template-canvas-tab";
import TemplateDataTab from "./template-data-tab";
import TemplateExportTab from "./template-export-tab";
import TemplateSchemaTab from "./template-schema-tab";

interface TemplatePropertiesTabsRendererProps {
  activeTab: V2BuilderTabId;
  renderConfig: V2TemplateRenderConfig;
  currentTheme: string;
  themeOptions: string[];
  assetTheme: string;
  setAssetTheme: (theme: string) => void;
  preferProfileDummyImage: boolean;
  formSchemaError: string | null;
  formSchemaDiagnostics: React.ComponentProps<typeof TemplateSchemaTab>["diagnostics"];
  copyState: "idle" | "success" | "error";
  entryValues: Record<string, unknown>;
  cardValues: Record<string, unknown>;
  globalValues: Record<string, unknown>;
  isOffline: boolean;
  fields: V2TemplateFormField[];
  computedKeys: readonly string[];
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  typeOptions: Array<{ value: V2TemplateFormField["type"]; label: string }>;
  assetKeys: Array<keyof V2TemplateAssetMap>;
  assetLabels: Record<keyof V2TemplateAssetMap, string>;
  renderStyleTab: () => React.ReactNode;
  renderPropertiesTab: () => React.ReactNode;
  onUpdateTemplateSize: (key: "width" | "height", value: number) => void;
  onChangeDefaultTheme: (theme: string) => void;
  onChangePreviewTheme: (theme: string) => void;
  onAppendSchemaField: () => void;
  onRemoveSchemaField: (index: number) => void;
  onUpdateSchemaField: (
    index: number,
    patch: Partial<V2TemplateFormField>
  ) => void;
  onTogglePreferProfileDummyImage: (value: boolean) => void;
  onUploadAssetFile: (
    key: keyof V2TemplateAssetMap,
    theme: string,
    file: File | null
  ) => void;
  onResetAsset: (key: keyof V2TemplateAssetMap, theme: string) => void;
  onChangeDataField: (
    scope: "entry" | "card" | "global",
    key: string,
    value: string | number
  ) => void;
  onToggleOffline: (value: boolean) => void;
  onCopyJson: () => void;
  onDownloadPreview: () => void;
  onResetData: () => void;
}

const TemplatePropertiesTabsRenderer: React.FC<
  TemplatePropertiesTabsRendererProps
> = ({
  activeTab,
  renderConfig,
  currentTheme,
  themeOptions,
  assetTheme,
  setAssetTheme,
  preferProfileDummyImage,
  formSchemaError,
  formSchemaDiagnostics,
  copyState,
  entryValues,
  cardValues,
  globalValues,
  isOffline,
  fields,
  computedKeys,
  scopeOptions,
  typeOptions,
  assetKeys,
  assetLabels,
  renderStyleTab,
  renderPropertiesTab,
  onUpdateTemplateSize,
  onChangeDefaultTheme,
  onChangePreviewTheme,
  onAppendSchemaField,
  onRemoveSchemaField,
  onUpdateSchemaField,
  onTogglePreferProfileDummyImage,
  onUploadAssetFile,
  onResetAsset,
  onChangeDataField,
  onToggleOffline,
  onCopyJson,
  onDownloadPreview,
  onResetData,
}) => {
  const renderCanvasTab = () => (
    <TemplateCanvasTab
      templateWidth={renderConfig.templateSize.width}
      templateHeight={renderConfig.templateSize.height}
      defaultTheme={renderConfig.defaultTheme}
      previewTheme={currentTheme}
      themeOptions={themeOptions}
      onUpdateTemplateSize={onUpdateTemplateSize}
      onChangeDefaultTheme={onChangeDefaultTheme}
      onChangePreviewTheme={onChangePreviewTheme}
    />
  );

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
      setAssetTheme={setAssetTheme}
      onTogglePreferProfileDummyImage={onTogglePreferProfileDummyImage}
      onUploadFile={onUploadAssetFile}
      onResetAsset={onResetAsset}
    />
  );

  const renderDataTab = () => (
    <TemplateDataTab
      fields={fields}
      entryValues={entryValues}
      cardValues={cardValues}
      globalValues={globalValues}
      isOffline={isOffline}
      onChangeField={onChangeDataField}
      onToggleOffline={onToggleOffline}
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

  return (
    <TemplateBuilderTabContentRouter
      activeTab={activeTab}
      renderCanvasTab={renderCanvasTab}
      renderSchemaTab={renderSchemaTab}
      renderPropertiesTab={renderPropertiesTab}
      renderStyleTab={renderStyleTab}
      renderAssetsTab={renderAssetsTab}
      renderDataTab={renderDataTab}
      renderExportTab={renderExportTab}
    />
  );
};

export default TemplatePropertiesTabsRenderer;
