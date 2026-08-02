"use client";

import { Check, ChevronDown, Pencil, Plus, Trash2, Type } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { useMemo, useState } from "react";

import { STUDIO_SETTINGS_FIELD_CLASS } from "@/components/studio/settings/studio-settings-fields";
import { cn } from "@/lib/utils";
import type { StudioWebFontSource } from "@/types/template-studio";
import { createStudioId } from "@/utils/template-studio/id";
import {
  getStudioParsedFontWeightOptions,
  parseStudioWebFontCss,
} from "@/utils/template-studio/web-fonts";

export interface StudioWebFontSettingsProps {
  sources: StudioWebFontSource[];
  usageBySourceId?: Record<string, string[]>;
  onChange: (sources: StudioWebFontSource[]) => void;
}

/**
 * 문서에 등록한 웹 폰트 소스 목록과 편집기.
 *
 * 편집 중인 입력값은 이 컴포넌트가 소유하고, 저장된 소스 배열만 밖으로
 * 알린다. 폰트는 도메인과 무관한 문서 설정이라 두 Studio가 함께 쓴다.
 */
export function StudioWebFontSettings({
  sources,
  usageBySourceId,
  onChange,
}: StudioWebFontSettingsProps) {
  const [fontLabel, setFontLabel] = useState("");
  const [fontCss, setFontCss] = useState("");
  const [editingFontId, setEditingFontId] = useState<string | null>(null);
  const [expandedFontIds, setExpandedFontIds] = useState<string[]>([]);
  const fontParseResult = useMemo(
    () => (fontCss.trim() ? parseStudioWebFontCss(fontCss) : null),
    [fontCss],
  );

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
        ? (sources.find((source) => source.id === editingFontId)?.enabled ??
          true)
        : true,
    };
    onChange(
      editingFontId
        ? sources.map((source) =>
            source.id === editingFontId ? nextSource : source,
          )
        : [...sources, nextSource],
    );
    resetFontEditor();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Type size={14} className="text-[var(--accent)]" />
        <h3 className="text-xs font-bold text-[var(--fg)]">Web Fonts</h3>
        <span className="ml-auto text-[10px] font-semibold text-[var(--fg3)]">
          {sources.length} sources
        </span>
      </div>

      {sources.length > 0 ? (
        <div className="grid gap-2">
          {sources.map((source) => {
            const parsed = parseStudioWebFontCss(source.cssText);
            const fontFamily = parsed.ok ? parsed.families[0] : undefined;
            const usage = usageBySourceId?.[source.id] ?? [];
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
                      onChange(
                        sources.map((current) =>
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
                        ? weightOptions.map((option) => option.value).join(", ")
                        : "Invalid CSS"}
                    </div>
                    {usageBySourceId ? (
                      <div
                        className="mt-1 text-[9px] font-medium leading-4 text-[var(--fg3)]"
                        data-studio-font-usage={source.id}
                      >
                        {usage.length > 0
                          ? `${usage.length} use${usage.length === 1 ? "" : "s"}: ${usage.join(", ")}`
                          : "No document uses this font"}
                      </div>
                    ) : null}
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
                      onChange(
                        sources.filter((current) => current.id !== source.id),
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
                          weightOptions.find((option) => option.value === 400)
                            ?.value ?? weightOptions[0]?.value,
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
          className={STUDIO_SETTINGS_FIELD_CLASS}
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
        <p className="text-[9px] font-medium leading-4 text-[var(--fg3)]">
          Missing font metrics are added automatically: ascent 84%, descent 16%,
          line gap 0%, and size adjust 100%. Explicit values are preserved.
        </p>
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
    </>
  );
}
