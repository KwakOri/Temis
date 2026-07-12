"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  Download,
  FileText,
  Monitor,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type {
  StudioTemplateDocument,
  StudioTimetableCapabilityKey,
  StudioWebFontSource,
} from "@/types/template-studio";
import { createStudioId } from "@/utils/template-studio/id";
import { getStudioTimetableCapabilities } from "@/utils/template-studio/timetable-capabilities";
import {
  getStudioParsedFontWeightOptions,
  getStudioWebFontSources,
  parseStudioWebFontCss,
} from "@/utils/template-studio/web-fonts";

type WorkspaceMode = "cards" | "timetable";
type StudioTheme = "dark" | "light";
type SettingsTab = "canvas" | "timetable" | "fonts" | "data" | "appearance" | "document";

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
  onWebFontsChange: (sources: StudioWebFontSource[]) => void;
}

const fieldClassName =
  "h-9 min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]";

const sectionClassName =
  "mx-auto grid w-full max-w-3xl content-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--field)]/20 p-4";

const settingsTabs = [
  {
    id: "canvas" as const,
    label: "Canvas",
    description: "Size & background",
    Icon: Monitor,
  },
  {
    id: "timetable" as const,
    label: "Timetable",
    description: "Status capabilities",
    Icon: CalendarDays,
  },
  {
    id: "fonts" as const,
    label: "Web Fonts",
    description: "Font sources",
    Icon: Type,
  },
  {
    id: "data" as const,
    label: "Data",
    description: "Sync & JSON",
    Icon: Database,
  },
  {
    id: "appearance" as const,
    label: "Appearance",
    description: "Editor theme",
    Icon: Palette,
  },
  {
    id: "document" as const,
    label: "Document",
    description: "Environment info",
    Icon: FileText,
  },
];

function CanvasNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <input
        className={fieldClassName}
        min={1}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

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
  onClose,
  onExportJson,
  onImportJson,
  onReloadTemplate,
  onThemeChange,
  onTimetableCapabilityChange,
  onTimetableCanvasChange,
  onWebFontsChange,
}: StudioSettingsModalProps) {
  const [fontLabel, setFontLabel] = useState("");
  const [fontCss, setFontCss] = useState("");
  const [editingFontId, setEditingFontId] = useState<string | null>(null);
  const [expandedFontIds, setExpandedFontIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<SettingsTab>("canvas");
  const webFonts = getStudioWebFontSources(document);
  const fontParseResult = useMemo(
    () => (fontCss.trim() ? parseStudioWebFontCss(fontCss) : null),
    [fontCss],
  );
  const timetableCanvas = document.domains?.timetable?.canvas;
  const timetableCapabilities = getStudioTimetableCapabilities(
    document.domains?.timetable,
  );

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const resetFontEditor = () => {
    setEditingFontId(null);
    setFontLabel("");
    setFontCss("");
  };

  const saveFontSource = () => {
    if (!fontParseResult?.ok) return;
    const nextSource: StudioWebFontSource = {
      id: editingFontId ?? createStudioId("font"),
      label: fontLabel.trim() || fontParseResult.families.join(", "),
      cssText: fontParseResult.cssText,
      enabled: editingFontId
        ? (webFonts.find((source) => source.id === editingFontId)?.enabled ??
          true)
        : true,
    };
    onWebFontsChange(
      editingFontId
        ? webFonts.map((source) =>
            source.id === editingFontId ? nextSource : source,
          )
        : [...webFonts, nextSource],
    );
    resetFontEditor();
  };

  const setActiveCanvasPreset = (width: number, height: number) => {
    if (activeWorkspaceMode === "timetable") {
      onTimetableCanvasChange({ width, height });
    } else {
      onCardsCanvasChange({ width, height });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-describedby="studio-settings-description"
        aria-labelledby="studio-settings-title"
        aria-modal="true"
        className="flex h-[calc(100vh-4rem)] max-h-[880px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        role="dialog"
      >
        <header className="flex h-16 shrink-0 items-center border-b border-[var(--border)] bg-[var(--panel)] px-5">
          <div>
            <h2
              className="text-base font-bold text-[var(--fg)]"
              id="studio-settings-title"
            >
              Settings
            </h2>
            <p
              className="text-[11px] font-semibold text-[var(--fg3)]"
              id="studio-settings-description"
            >
              Template document settings
            </p>
          </div>
          <button
            aria-label="Close settings"
            autoFocus
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Close settings"
            type="button"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Settings categories"
            className="w-44 shrink-0 border-r border-[var(--border)] bg-[var(--field)]/15 p-3 sm:w-52"
          >
            <div className="grid gap-1" role="tablist" aria-orientation="vertical">
              {settingsTabs.map(({ id, label, description, Icon }) => (
                <button
                  aria-controls={`studio-settings-panel-${id}`}
                  aria-selected={activeTab === id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    activeTab === id
                      ? "bg-[var(--sel)] text-[var(--fg)] shadow-[inset_0_0_0_1px_var(--field-border)]"
                      : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                  )}
                  id={`studio-settings-tab-${id}`}
                  key={id}
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab(id)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      activeTab === id && "text-[var(--accent)]",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">{label}</span>
                    <span className="block truncate text-[10px] font-semibold text-[var(--fg3)]">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
          <section
            aria-labelledby="studio-settings-tab-canvas"
            className={cn(
              sectionClassName,
              activeTab !== "canvas" && "hidden",
            )}
            id="studio-settings-panel-canvas"
            role="tabpanel"
          >
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
              <CanvasNumberField
                label="Width"
                value={document.canvas.width}
                onChange={(width) => onCardsCanvasChange({ width })}
              />
              <CanvasNumberField
                label="Height"
                value={document.canvas.height}
                onChange={(height) => onCardsCanvasChange({ height })}
              />
            </div>
            <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Background</span>
              <input
                className={fieldClassName}
                value={document.canvas.background}
                onChange={(event) =>
                  onCardsCanvasChange({ background: event.currentTarget.value })
                }
              />
            </label>
          </div>

          <div className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
              Timetable
            </div>
            {timetableCanvas ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <CanvasNumberField
                    label="Width"
                    value={timetableCanvas.width}
                    onChange={(width) => onTimetableCanvasChange({ width })}
                  />
                  <CanvasNumberField
                    label="Height"
                    value={timetableCanvas.height}
                    onChange={(height) => onTimetableCanvasChange({ height })}
                  />
                </div>
                <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                  <span>Background</span>
                  <div className="flex gap-2">
                    <input
                      className="h-9 w-10 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-1"
                      type="color"
                      value={timetableCanvas.backgroundColor ?? "#eef2f7"}
                      onChange={(event) =>
                        onTimetableCanvasChange({
                          backgroundColor: event.currentTarget.value,
                        })
                      }
                    />
                    <input
                      className={cn(fieldClassName, "flex-1")}
                      value={timetableCanvas.backgroundColor ?? "#eef2f7"}
                      onChange={(event) =>
                        onTimetableCanvasChange({
                          backgroundColor: event.currentTarget.value,
                        })
                      }
                    />
                  </div>
                </label>
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
          </section>

          <section
            aria-labelledby="studio-settings-tab-timetable"
            className={cn(
              sectionClassName,
              activeTab !== "timetable" && "hidden",
            )}
            id="studio-settings-panel-timetable"
            role="tabpanel"
          >
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold text-[var(--fg)]">
              Timetable Statuses
            </h3>
          </div>

          {document.domains?.timetable ? (
            <div className="grid gap-2">
              {(
                [
                  {
                    capabilityKey: "multi" as const,
                    label: "Multi Status",
                    description:
                      "Enable the fixed two-entry runtime and Multi card layout.",
                  },
                  {
                    capabilityKey: "offlineMemo" as const,
                    label: "Offline Memo Status",
                    description:
                      "Enable the Offline Memo entry status and card layout.",
                  },
                ] satisfies Array<{
                  capabilityKey: StudioTimetableCapabilityKey;
                  label: string;
                  description: string;
                }>
              ).map(({ capabilityKey, label, description }) => {
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
              })}
            </div>
          ) : (
            <p className="text-xs font-semibold text-[var(--fg3)]">
              This document has no Timetable domain.
            </p>
          )}
          </section>

          <section
            aria-labelledby="studio-settings-tab-fonts"
            className={cn(
              sectionClassName,
              activeTab !== "fonts" && "hidden",
            )}
            id="studio-settings-panel-fonts"
            role="tabpanel"
          >
          <div className="flex items-center gap-2">
            <Type size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold text-[var(--fg)]">Web Fonts</h3>
            <span className="ml-auto text-[10px] font-semibold text-[var(--fg3)]">
              {webFonts.length} sources
            </span>
          </div>

          {webFonts.length > 0 ? (
            <div className="grid gap-2">
              {webFonts.map((source) => {
                const parsed = parseStudioWebFontCss(source.cssText);
                const fontFamily = parsed.ok ? parsed.families[0] : undefined;
                const weightOptions = parsed.ok
                  ? getStudioParsedFontWeightOptions(parsed.faces, fontFamily)
                  : [];
                const isExpanded = expandedFontIds.includes(source.id);
                return (
                  <div
                    className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3"
                    key={source.id}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border",
                          source.enabled
                            ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                            : "border-[var(--field-border)] text-transparent",
                        )}
                        title={source.enabled ? "Disable font" : "Enable font"}
                        type="button"
                        onClick={() =>
                          onWebFontsChange(
                            webFonts.map((current) =>
                              current.id === source.id
                                ? { ...current, enabled: !current.enabled }
                                : current,
                            ),
                          )
                        }
                      >
                        <Check size={12} />
                      </button>
                      <button
                        aria-controls={`studio-font-weights-${source.id}`}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${source.label} font weights`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-35"
                        disabled={!parsed.ok || !fontFamily}
                        title={`${isExpanded ? "Collapse" : "Expand"} font weights`}
                        type="button"
                        onClick={() =>
                          setExpandedFontIds((current) =>
                            current.includes(source.id)
                              ? current.filter((id) => id !== source.id)
                              : [...current, source.id],
                          )
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-[var(--fg)]">
                          {source.label}
                        </div>
                        <div className="truncate text-[10px] font-semibold text-[var(--fg3)]">
                          {parsed.ok
                            ? weightOptions
                                .map((option) => option.value)
                                .join(", ")
                            : "Invalid CSS"}
                        </div>
                      </div>
                      <button
                        className="text-[var(--fg2)] hover:text-[var(--fg)]"
                        title="Edit font"
                        type="button"
                        onClick={() => {
                          setEditingFontId(source.id);
                          setFontLabel(source.label);
                          setFontCss(source.cssText);
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="text-[var(--fg2)] hover:text-rose-300"
                        title="Delete font"
                        type="button"
                        onClick={() =>
                          onWebFontsChange(
                            webFonts.filter(
                              (current) => current.id !== source.id,
                            ),
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {parsed.ok && fontFamily ? (
                      isExpanded ? (
                        <div
                          className="grid gap-1.5"
                          id={`studio-font-weights-${source.id}`}
                        >
                          {weightOptions.map((option) => (
                            <div
                              className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-[var(--field-border)] bg-[var(--panel)] px-3 py-2"
                              key={option.value}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[11px] font-bold text-[var(--fg)]">
                                  {option.label}
                                </div>
                                <div className="text-[10px] font-semibold text-[var(--fg3)]">
                                  {option.value}
                                </div>
                              </div>
                              <div
                                className="truncate text-base text-[var(--fg)]"
                                style={{
                                  fontFamily,
                                  fontWeight: option.value,
                                }}
                              >
                                가나다라마바사 ABC 123
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="truncate rounded-lg bg-[var(--panel)] px-2.5 py-2 text-base text-[var(--fg)]"
                          style={{
                            fontFamily,
                            fontWeight:
                              weightOptions.find(
                                (option) => option.value === 400,
                              )?.value ?? weightOptions[0]?.value,
                          }}
                        >
                          가나다라마바사 ABC 123
                        </div>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="grid gap-2 rounded-xl border border-dashed border-[var(--field-border)] p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--fg)]">
              <Plus size={13} />
              {editingFontId ? "Edit font source" : "Add font source"}
            </div>
            <input
              className={fieldClassName}
              placeholder="Label (optional)"
              value={fontLabel}
              onChange={(event) => setFontLabel(event.currentTarget.value)}
            />
            <textarea
              className="min-h-44 resize-y rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2.5 font-mono text-[10px] leading-relaxed text-[var(--fg)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--accent)]"
              placeholder="Paste one or more @font-face blocks"
              spellCheck={false}
              value={fontCss}
              onChange={(event) => setFontCss(event.currentTarget.value)}
            />
            {fontParseResult ? (
              fontParseResult.ok ? (
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-2 text-[10px] font-semibold text-emerald-300">
                  {fontParseResult.families.join(", ")} ·{" "}
                  {fontParseResult.faces.length} faces
                </div>
              ) : (
                <div className="grid gap-1 rounded-lg border border-rose-400/25 bg-rose-400/10 px-2.5 py-2 text-[10px] font-semibold text-rose-300">
                  {fontParseResult.errors.map((error, index) => (
                    <div key={`${error.blockIndex ?? "root"}-${index}`}>
                      {error.blockIndex === undefined
                        ? error.message
                        : `Block ${error.blockIndex + 1}: ${error.message}`}
                    </div>
                  ))}
                </div>
              )
            ) : null}
            <div className="flex justify-end gap-2">
              {editingFontId ? (
                <button
                  className="h-8 rounded-lg px-3 text-xs font-semibold text-[var(--fg2)] hover:bg-[var(--hover)]"
                  type="button"
                  onClick={resetFontEditor}
                >
                  Cancel
                </button>
              ) : null}
              <button
                className="h-8 rounded-lg bg-[var(--accent)] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!fontParseResult?.ok}
                type="button"
                onClick={saveFontSource}
              >
                {editingFontId ? "Update font" : "Add font"}
              </button>
            </div>
          </div>
          </section>

          <section
            aria-labelledby="studio-settings-tab-data"
            className={cn(sectionClassName, activeTab !== "data" && "hidden")}
            id="studio-settings-panel-data"
            role="tabpanel"
          >
          <div className="flex items-center gap-2">
            <Database size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold text-[var(--fg)]">Data</h3>
          </div>
          <button
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-semibold text-[var(--fg2)] hover:text-[var(--fg)] disabled:opacity-40"
            disabled={isReloadDisabled}
            type="button"
            onClick={onReloadTemplate}
          >
            <RefreshCw size={14} /> Reload selected database template
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-xs font-semibold text-[var(--fg2)] hover:text-[var(--fg)]"
              type="button"
              onClick={onExportJson}
            >
              <Download size={14} /> Export JSON
            </button>
            <button
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-xs font-semibold text-[var(--fg2)] hover:text-[var(--fg)]"
              type="button"
              onClick={onImportJson}
            >
              <Upload size={14} /> Import JSON
            </button>
          </div>
          </section>

          <section
            aria-labelledby="studio-settings-tab-appearance"
            className={cn(
              sectionClassName,
              activeTab !== "appearance" && "hidden",
            )}
            id="studio-settings-panel-appearance"
            role="tabpanel"
          >
          <h3 className="text-xs font-bold text-[var(--fg)]">Appearance</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((option) => (
              <button
                className={cn(
                  "h-9 rounded-lg border text-xs font-semibold capitalize",
                  theme === option
                    ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--fg)]"
                    : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)]",
                )}
                key={option}
                type="button"
                onClick={() => onThemeChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
          </section>

          <section
            aria-labelledby="studio-settings-tab-document"
            className={cn(
              sectionClassName,
              "gap-2 text-[11px] font-semibold text-[var(--fg2)]",
              activeTab !== "document" && "hidden",
            )}
            id="studio-settings-panel-document"
            role="tabpanel"
          >
          <h3 className="mb-1 text-xs font-bold text-[var(--fg)]">
            Environment & Document
          </h3>
          <div className="flex justify-between">
            <span>Database</span>
            <span className="text-[var(--fg)]">{databaseTargetLabel}</span>
          </div>
          <div className="flex justify-between">
            <span>Schema</span>
            <span className="text-[var(--fg)]">
              {document.schema} v{document.version}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Objects</span>
            <span className="text-[var(--fg)]">{objectCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Inputs</span>
            <span className="text-[var(--fg)]">{inputCount}</span>
          </div>
          </section>
          </div>
        </div>
      </section>
    </div>
  );
}
