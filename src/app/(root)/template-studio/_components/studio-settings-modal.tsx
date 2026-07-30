"use client";

import { CalendarDays, Monitor } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import {
  StudioSettingsDialog,
  type StudioSettingsSection,
} from "@/components/studio/settings/studio-settings-dialog";
import {
  StudioGuideLayerSettings,
  StudioSettingsNumberField,
} from "@/components/studio/settings/studio-settings-fields";
import type {
  StudioTemplateDocument,
  StudioTimetableCapabilityKey,
  StudioWebFontSource,
} from "@/types/template-studio";
import { getStudioTimetableCapabilities } from "@/utils/template-studio/timetable-capabilities";
import {
  getStudioCardsGuide,
  getStudioTimetableGuide,
} from "@/utils/template-studio/timetable-guide";
import { getStudioWebFontSources } from "@/utils/template-studio/web-fonts";

import { StudioHexColorPicker } from "./studio-hex-color-picker";

type WorkspaceMode = "cards" | "timetable";
type StudioTheme = "dark" | "light";

interface StudioSettingsModalProps {
  activeWorkspaceMode: WorkspaceMode;
  databaseTargetLabel: string;
  document: StudioTemplateDocument;
  inputCount: number;
  isReloadDisabled: boolean;
  objectCount: number;
  open: boolean;
  theme: StudioTheme;
  onCardsCanvasChange: (nextSize: {
    width?: number;
    height?: number;
    background?: string;
  }) => void;
  onCardsGuideRemove: () => void;
  onCardsGuideUpload: (file: File) => void;
  onClose: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onReloadTemplate: () => void;
  onThemeChange: (theme: StudioTheme) => void;
  onTimetableCapabilityChange: (
    capabilityKey: StudioTimetableCapabilityKey,
    enabled: boolean,
  ) => void;
  onTimetableCanvasChange: (nextSize: {
    width?: number;
    height?: number;
    backgroundColor?: string;
  }) => void;
  onTimetableGuideRemove: () => void;
  onTimetableGuideUpload: (file: File) => void;
  onWebFontsChange: (sources: StudioWebFontSource[]) => void;
}

const TIMETABLE_CAPABILITY_OPTIONS = [
  {
    capabilityKey: "multi" as const,
    label: "Multi Status",
    description: "Enable the fixed two-entry runtime and Multi card layout.",
  },
  {
    capabilityKey: "offlineMemo" as const,
    label: "Offline Memo Status",
    description: "Enable the Offline Memo entry status and card layout.",
  },
] satisfies Array<{
  capabilityKey: StudioTimetableCapabilityKey;
  label: string;
  description: string;
}>;

/**
 * Template Studio 설정.
 *
 * 공통 설정 다이얼로그에 시간표 전용 섹션(캔버스, 상태 capability)만 넘긴다.
 * 웹 폰트, 데이터, 테마와 문서 정보는 공통 설정이 담당한다.
 */
export function StudioSettingsModal({
  activeWorkspaceMode,
  databaseTargetLabel,
  document,
  inputCount,
  isReloadDisabled,
  objectCount,
  open,
  theme,
  onCardsCanvasChange,
  onCardsGuideRemove,
  onCardsGuideUpload,
  onClose,
  onExportJson,
  onImportJson,
  onReloadTemplate,
  onThemeChange,
  onTimetableCapabilityChange,
  onTimetableCanvasChange,
  onTimetableGuideRemove,
  onTimetableGuideUpload,
  onWebFontsChange,
}: StudioSettingsModalProps) {
  const timetableCanvas = document.domains?.timetable?.canvas;
  const timetableCapabilities = getStudioTimetableCapabilities(
    document.domains?.timetable,
  );
  const cardsGuide = getStudioCardsGuide(document);
  const cardsGuideAsset = cardsGuide.assetId
    ? document.assets[cardsGuide.assetId]
    : null;
  const timetableGuide = getStudioTimetableGuide(document);
  const timetableGuideAsset = timetableGuide.assetId
    ? document.assets[timetableGuide.assetId]
    : null;

  const setActiveCanvasPreset = (width: number, height: number) => {
    if (activeWorkspaceMode === "timetable") {
      onTimetableCanvasChange({ width, height });
    } else {
      onCardsCanvasChange({ width, height });
    }
  };

  const domainSections: StudioSettingsSection[] = [
    {
      id: "canvas",
      label: "Canvas",
      description: "Size & background",
      navIcon: Monitor,
      content: (
        <>
          <div className="flex items-center gap-2">
            <Monitor size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold text-[var(--fg)]">Canvas</h3>
            <span className="ml-auto rounded bg-[var(--sel)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--accent)]">
              {activeWorkspaceMode}
            </span>
          </div>

          <div className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
              Cards
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StudioSettingsNumberField
                label="Width"
                value={document.canvas.width}
                onChange={(width) => onCardsCanvasChange({ width })}
              />
              <StudioSettingsNumberField
                label="Height"
                value={document.canvas.height}
                onChange={(height) => onCardsCanvasChange({ height })}
              />
            </div>
            <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Background</span>
              <StudioHexColorPicker
                allowTransparent
                ariaLabel="Cards canvas background"
                className="h-9"
                value={document.canvas.background}
                onChange={(background) => onCardsCanvasChange({ background })}
              />
            </label>
            <StudioGuideLayerSettings
              assetLabel={cardsGuideAsset?.label ?? null}
              description="Editor-only overlay for cards alignment."
              removeAriaLabel="Remove cards guide"
              onRemove={onCardsGuideRemove}
              onUpload={onCardsGuideUpload}
            />
          </div>

          <div className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
              Timetable
            </div>
            {timetableCanvas ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <StudioSettingsNumberField
                    label="Width"
                    value={timetableCanvas.width}
                    onChange={(width) => onTimetableCanvasChange({ width })}
                  />
                  <StudioSettingsNumberField
                    label="Height"
                    value={timetableCanvas.height}
                    onChange={(height) => onTimetableCanvasChange({ height })}
                  />
                </div>
                <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                  <span>Background</span>
                  <StudioHexColorPicker
                    allowTransparent
                    ariaLabel="Timetable canvas background"
                    className="h-9"
                    value={timetableCanvas.backgroundColor ?? "#EEF2F7"}
                    onChange={(backgroundColor) =>
                      onTimetableCanvasChange({ backgroundColor })
                    }
                  />
                </label>
                <StudioGuideLayerSettings
                  assetLabel={timetableGuideAsset?.label ?? null}
                  description="Editor-only overlay for timetable alignment."
                  removeAriaLabel="Remove timetable guide"
                  onRemove={onTimetableGuideRemove}
                  onUpload={onTimetableGuideUpload}
                />
              </>
            ) : (
              <p className="text-xs font-semibold text-[var(--fg3)]">
                This document has no Timetable domain.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              [1920, 1080],
              [4000, 2250],
            ].map(([width, height]) => (
              <button
                className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                key={`${width}x${height}`}
                type="button"
                onClick={() => setActiveCanvasPreset(width, height)}
              >
                {width} × {height}
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      id: "timetable",
      label: "Timetable",
      description: "Status capabilities",
      navIcon: CalendarDays,
      content: (
        <>
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold text-[var(--fg)]">
              Timetable Statuses
            </h3>
          </div>

          {document.domains?.timetable ? (
            <div className="grid gap-2">
              {TIMETABLE_CAPABILITY_OPTIONS.map(
                ({ capabilityKey, label, description }) => {
                  const enabled = timetableCapabilities[capabilityKey].enabled;

                  return (
                    <label
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3"
                      key={capabilityKey}
                    >
                      <span className="grid gap-1">
                        <span className="text-xs font-bold text-[var(--fg)]">
                          {label}
                        </span>
                        <span className="text-[10px] font-semibold leading-relaxed text-[var(--fg3)]">
                          {description}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">
                          {enabled ? "Enabled" : "Disabled"}
                        </span>
                      </span>
                      <input
                        aria-label={label}
                        checked={enabled}
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                        type="checkbox"
                        onChange={(event) =>
                          onTimetableCapabilityChange(
                            capabilityKey,
                            event.currentTarget.checked,
                          )
                        }
                      />
                    </label>
                  );
                },
              )}
            </div>
          ) : (
            <p className="text-xs font-semibold text-[var(--fg3)]">
              This document has no Timetable domain.
            </p>
          )}
        </>
      ),
    },
  ];

  return (
    <StudioSettingsDialog
      common={{
        theme,
        onThemeChange,
        webFonts: {
          sources: getStudioWebFontSources(document),
          onChange: onWebFontsChange,
        },
        data: {
          isReloadDisabled,
          onReloadTemplate,
          onExportJson,
          onImportJson,
        },
        documentInfo: {
          databaseTargetLabel,
          schemaLabel: `${document.schema} v${document.version}`,
          objectCount,
          inputCount,
        },
      }}
      description="Template document settings"
      domainSections={domainSections}
      open={open}
      title="Settings"
      onClose={onClose}
    />
  );
}
