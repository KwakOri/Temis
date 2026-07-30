"use client";

import {
  Database,
  Download,
  FileText,
  Palette,
  RefreshCw,
  Type,
  Upload,
} from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import type { StudioSettingsSection } from "@/components/studio/settings/studio-settings-dialog";
import { StudioWebFontSettings } from "@/components/studio/settings/studio-web-font-settings";
import { cn } from "@/lib/utils";
import type { StudioWebFontSource } from "@/types/template-studio";

export type StudioSettingsTheme = "dark" | "light";

export interface StudioCommonSettingsModel {
  theme: StudioSettingsTheme;
  onThemeChange: (theme: StudioSettingsTheme) => void;
  webFonts: {
    sources: StudioWebFontSource[];
    onChange: (sources: StudioWebFontSource[]) => void;
  };
  data: {
    /** 원격 문서를 다시 불러올 수 없는 상태 */
    isReloadDisabled: boolean;
    onReloadTemplate: () => void;
    onExportJson: () => void;
    onImportJson: () => void;
  };
  documentInfo: {
    databaseTargetLabel: string;
    /** 스키마와 버전을 합친 표시 문자열 */
    schemaLabel: string;
    objectCount: number;
    inputCount: number;
  };
}

/**
 * 두 Studio가 함께 쓰는 설정 섹션 배열.
 *
 * 웹 폰트, 데이터 동기화와 JSON, 편집기 테마, 문서 정보는 도메인과 무관한
 * 문서 설정이라 공통으로 만든다. 캔버스와 도메인 capability는 여기 없다.
 */
export function buildStudioCommonSettingsSections(
  model: StudioCommonSettingsModel,
): StudioSettingsSection[] {
  return [
    {
      id: "fonts",
      label: "Web Fonts",
      description: "Font sources",
      navIcon: Type,
      content: (
        <StudioWebFontSettings
          sources={model.webFonts.sources}
          onChange={model.webFonts.onChange}
        />
      ),
    },
    {
      id: "data",
      label: "Data",
      description: "Sync & JSON",
      navIcon: Database,
      content: (
        <>
          <div className="flex items-center gap-2">
            <Database size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold text-[var(--fg)]">Data</h3>
          </div>
          <button
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-semibold text-[var(--fg2)] hover:text-[var(--fg)] disabled:opacity-40"
            disabled={model.data.isReloadDisabled}
            type="button"
            onClick={model.data.onReloadTemplate}
          >
            <RefreshCw size={14} /> Reload selected database template
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-xs font-semibold text-[var(--fg2)] hover:text-[var(--fg)]"
              type="button"
              onClick={model.data.onExportJson}
            >
              <Download size={14} /> Export JSON
            </button>
            <button
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-xs font-semibold text-[var(--fg2)] hover:text-[var(--fg)]"
              type="button"
              onClick={model.data.onImportJson}
            >
              <Upload size={14} /> Import JSON
            </button>
          </div>
        </>
      ),
    },
    {
      id: "appearance",
      label: "Appearance",
      description: "Editor theme",
      navIcon: Palette,
      content: (
        <>
          <h3 className="text-xs font-bold text-[var(--fg)]">Appearance</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((option) => (
              <button
                className={cn(
                  "h-9 rounded-lg border text-xs font-semibold capitalize",
                  model.theme === option
                    ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--fg)]"
                    : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)]",
                )}
                key={option}
                type="button"
                onClick={() => model.onThemeChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      id: "document",
      label: "Document",
      description: "Environment info",
      navIcon: FileText,
      contentClassName: "gap-2 text-[11px] font-semibold text-[var(--fg2)]",
      content: (
        <>
          <h3 className="mb-1 text-xs font-bold text-[var(--fg)]">
            Environment &amp; Document
          </h3>
          <div className="flex justify-between">
            <span>Database</span>
            <span className="text-[var(--fg)]">
              {model.documentInfo.databaseTargetLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Schema</span>
            <span className="text-[var(--fg)]">
              {model.documentInfo.schemaLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Objects</span>
            <span className="text-[var(--fg)]">
              {model.documentInfo.objectCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Inputs</span>
            <span className="text-[var(--fg)]">
              {model.documentInfo.inputCount}
            </span>
          </div>
        </>
      ),
    },
  ];
}
