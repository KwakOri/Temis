"use client";
import React from "react";
import { StudioTextField } from "./studio-inspector-fields";
import type { StudioBinding, StudioTimeFormat } from "@/types/template-studio";
import {
  STUDIO_TIME_DEFAULT_AM_TEXT,
  STUDIO_TIME_DEFAULT_PM_TEXT,
  STUDIO_TIME_FORMAT_OPTIONS,
  normalizeStudioTimeFormat,
  normalizeStudioTimeText,
} from "@/utils/template-studio/builtin-fields";
import {
  getStudioDateFormatPreset,
  getStudioDateFormatPresetValue,
  getStudioDateFormatPresets,
  getStudioDateTemplateTokens,
  getStudioDateTemplateValue,
  type StudioDateFormatMode,
} from "@/utils/template-studio/date-template";
import {
  getStudioBindingFormatFeatures,
  type StudioBindingFormatPatch,
} from "@/utils/template-studio/binding-format";
const SELECT_CLASS =
  "h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]";
const FIELD_LABEL_CLASS =
  "grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]";
export interface StudioDateFormatControlsProps {
  format?: string;
  template?: string;
  mode?: StudioDateFormatMode;
  onChange: (value: { format: string; template: string }) => void;
}

export interface StudioTimeFormatControlsProps {
  format?: StudioTimeFormat;
  amText?: string;
  pmText?: string;
  onChange: (value: {
    format: StudioTimeFormat;
    amText: string;
    pmText: string;
  }) => void;
}

/** Timetable 기간과 Thumbnail 단일 날짜가 공유하는 형식 편집 컨트롤. */
export function StudioDateFormatControls({
  format,
  template,
  mode = "range",
  onChange,
}: StudioDateFormatControlsProps) {
  const templateValue = getStudioDateTemplateValue(format, template, mode);
  const presetValue = getStudioDateFormatPresetValue(format, template, mode);
  const presets = getStudioDateFormatPresets(mode);
  const tokens = getStudioDateTemplateTokens(mode);

  return (
    <div className="grid gap-2">
      <label className={FIELD_LABEL_CLASS}>
        <span>Date Format</span>
        <select
          className={SELECT_CLASS}
          value={presetValue}
          onChange={(event) => {
            const nextFormat = event.currentTarget.value;
            const preset = getStudioDateFormatPreset(nextFormat, mode);
            onChange({
              format: nextFormat,
              template: preset?.template ?? templateValue,
            });
          }}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom template</option>
        </select>
      </label>

      <label className={FIELD_LABEL_CLASS}>
        <span>Template</span>
        <textarea
          className="min-h-20 resize-y rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 py-2 font-mono text-[11px] font-semibold leading-relaxed text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          spellCheck={false}
          value={templateValue}
          onChange={(event) =>
            onChange({
              format: "custom",
              template: event.currentTarget.value,
            })
          }
        />
      </label>

      <div className="grid grid-cols-2 gap-1.5">
        {tokens.map((token) => (
          <button
            className="h-7 rounded-md border border-[var(--field-border)] bg-[var(--field)] px-1.5 font-mono text-[10px] font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            key={token}
            title={token}
            type="button"
            onClick={() => {
              const separator = templateValue.trim().length > 0 ? " " : "";
              onChange({
                format: "custom",
                template: `${templateValue}${separator}${token}`,
              });
            }}
          >
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 시간 필드의 12/24시간 표기와 AM/PM 대체 문구를 편집한다. */
export function StudioTimeFormatControls({
  format,
  amText,
  pmText,
  onChange,
}: StudioTimeFormatControlsProps) {
  const normalizedFormat = normalizeStudioTimeFormat(format);
  const normalizedAmText = normalizeStudioTimeText(
    amText,
    STUDIO_TIME_DEFAULT_AM_TEXT,
  );
  const normalizedPmText = normalizeStudioTimeText(
    pmText,
    STUDIO_TIME_DEFAULT_PM_TEXT,
  );

  const update = (patch: Partial<StudioTimeFormatControlsProps>) =>
    onChange({
      format: patch.format ?? normalizedFormat,
      amText: patch.amText ?? normalizedAmText,
      pmText: patch.pmText ?? normalizedPmText,
    });

  return (
    <div className="grid gap-2">
      <label className={FIELD_LABEL_CLASS}>
        <span>Time Format</span>
        <select
          className={SELECT_CLASS}
          value={normalizedFormat}
          onChange={(event) =>
            update({
              format: normalizeStudioTimeFormat(
                event.currentTarget.value as StudioTimeFormat,
              ),
            })
          }
        >
          {STUDIO_TIME_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {normalizedFormat === "half" ? (
        <div className="grid grid-cols-2 gap-2">
          <StudioTextField
            label="AM Text"
            value={normalizedAmText}
            onChange={(value) => update({ amText: value })}
          />
          <StudioTextField
            label="PM Text"
            value={normalizedPmText}
            onChange={(value) => update({ pmText: value })}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Cards, Timetable and other editors use the same field-driven format controls. */
export function StudioBuiltinFieldFormatControls({
  binding,
  onChange,
}: {
  binding: Extract<StudioBinding, { kind: "builtinField" }>;
  onChange: (patch: StudioBindingFormatPatch) => void;
}) {
  const features = getStudioBindingFormatFeatures(binding);
  return (
    <>
      {features.dateFormatMode ? (
        <StudioDateFormatControls
          mode={features.dateFormatMode}
          format={
            binding.dateRangeFormat ??
            (binding.fieldId === "day.date" ? "short" : undefined)
          }
          template={binding.dateRangeTemplate}
          onChange={({ format, template }) =>
            onChange({ dateRangeFormat: format, dateRangeTemplate: template })
          }
        />
      ) : null}
      {features.timeFormat ? (
        <StudioTimeFormatControls
          format={binding.timeFormat}
          amText={binding.timeAmText}
          pmText={binding.timePmText}
          onChange={({ format, amText, pmText }) =>
            onChange({
              timeFormat: format,
              timeAmText: amText,
              timePmText: pmText,
            })
          }
        />
      ) : null}
    </>
  );
}
