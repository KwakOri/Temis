"use client";
import React, { useState } from "react";
import { StudioTextField } from "./studio-inspector-fields";
import type {
  StudioBinding,
  StudioTimeFormat,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { resolveStudioTextBinding } from "@/utils/template-studio/binding-resolver";
import {
  createStudioInitialRuntimeValues,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import {
  STUDIO_TIME_DEFAULT_AM_TEXT,
  STUDIO_TIME_DEFAULT_PM_TEXT,
  STUDIO_TIME_FORMAT_OPTIONS,
  normalizeStudioTimeFormat,
  normalizeStudioTimeText,
} from "@/utils/template-studio/builtin-fields";
import {
  getStudioDateFormatPresetValue,
  getStudioDateFormatPresets,
  getStudioDateTemplateValue,
  resolveStudioSingleDateText,
  resolveStudioDateRangeText,
  type StudioDateFormatMode,
} from "@/utils/template-studio/date-template";
import {
  getStudioBindingFormatFeatures,
  type StudioBindingFormatPatch,
} from "@/utils/template-studio/binding-format";
import { StudioTemplateFormatEditor } from "./studio-template-format-editor";
import { StudioFormatActions, StudioFormatModal } from "./studio-format-modal";
import { formatTime } from "@/utils/time-formatter";

const DATE_TOKEN_LABELS: Record<string, string> = {
  YYYY: "연도 네 자리",
  YY: "연도 두 자리",
  MM: "월 두 자리",
  M: "월 숫자",
  DD: "일 두 자리",
  D: "일 숫자",
  weekday: "영문 요일",
  weekdayShort: "영문 요일 약칭",
  localized: "지역별 월·일",
  localizedWithYear: "지역별 연·월·일",
};
const DATE_TOKENS = Object.keys(DATE_TOKEN_LABELS);
const RECOGNIZED_DATE_TOKENS = ["", "start.", "end."].flatMap((prefix) =>
  DATE_TOKENS.map((token) => `\${${prefix}${token}}`),
);

const SELECT_CLASS =
  "h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]";
const FIELD_LABEL_CLASS =
  "grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]";
export interface StudioDateFormatControlsProps {
  format?: string;
  template?: string;
  mode?: StudioDateFormatMode;
  preview?: (template: string) => string;
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

/** Dates keep the stored template syntax while editing it as blocks. */
export function StudioDateFormatControls({
  format,
  template,
  mode = "range",
  preview,
  onChange,
}: StudioDateFormatControlsProps) {
  const templateValue = getStudioDateTemplateValue(format, template, mode);
  const presetValue = getStudioDateFormatPresetValue(format, template, mode);
  const presets = getStudioDateFormatPresets(mode);
  const prefixes = mode === "range" ? ["start.", "end."] : [""];
  return (
    <StudioTemplateFormatEditor
      title="Date Format"
      summary={
        presets.find((preset) => preset.id === presetValue)?.label ??
        "사용자 지정"
      }
      template={templateValue}
      tokens={prefixes.flatMap((prefix) =>
        DATE_TOKENS.map((token) => ({
          value: `\${${prefix}${token}}`,
          label: DATE_TOKEN_LABELS[token],
          group:
            prefix === "start."
              ? "시작일"
              : prefix === "end."
                ? "종료일"
                : "날짜",
        })),
      )}
      recognizedTokens={RECOGNIZED_DATE_TOKENS}
      presets={presets.map((preset) => ({ ...preset }))}
      preview={
        preview ??
        ((draft) =>
          mode === "range"
            ? resolveStudioDateRangeText({
                startDate: "2026-07-01",
                endDate: "2026-07-07",
                format: "custom",
                template: draft,
              })
            : resolveStudioSingleDateText({
                date: "2026-07-01",
                format: "custom",
                template: draft,
              }))
      }
      onApply={onChange}
    />
  );
}

/** 시간 필드의 12/24시간 표기와 AM/PM 대체 문구를 편집한다. */
export function StudioTimeFormatControls(props: StudioTimeFormatControlsProps) {
  const format = normalizeStudioTimeFormat(props.format);
  return (
    <StudioFormatModal
      title="Time Format"
      summary={
        STUDIO_TIME_FORMAT_OPTIONS.find((option) => option.value === format)
          ?.label ?? "24-hour"
      }
    >
      {(close) => (
        <TimeFormatDraft
          {...props}
          onCancel={close}
          onChange={(value) => {
            props.onChange(value);
            close();
          }}
        />
      )}
    </StudioFormatModal>
  );
}

function TimeFormatDraft({
  format,
  amText,
  pmText,
  onChange,
  onCancel,
}: StudioTimeFormatControlsProps & { onCancel: () => void }) {
  const initial = {
    format: normalizeStudioTimeFormat(format),
    amText: normalizeStudioTimeText(amText, STUDIO_TIME_DEFAULT_AM_TEXT),
    pmText: normalizeStudioTimeText(pmText, STUDIO_TIME_DEFAULT_PM_TEXT),
  };
  const [draft, setDraft] = useState(initial);
  return (
    <>
      <div className="grid gap-4 overflow-y-auto p-5">
        <label className={FIELD_LABEL_CLASS}>
          <span>Time Format</span>
          <select
            aria-label="Time format preset"
            className={SELECT_CLASS}
            value={draft.format}
            onChange={(event) =>
              setDraft({
                ...draft,
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
        {draft.format === "half" ? (
          <div className="grid grid-cols-2 gap-3">
            <StudioTextField
              label="AM Text"
              value={draft.amText}
              onChange={(value) =>
                setDraft((current) => ({ ...current, amText: value }))
              }
            />
            <StudioTextField
              label="PM Text"
              value={draft.pmText}
              onChange={(value) =>
                setDraft((current) => ({ ...current, pmText: value }))
              }
            />
          </div>
        ) : null}
        <output
          aria-label="Time format preview"
          className="rounded-xl border border-[var(--border)] bg-[var(--field)] p-4 text-lg font-semibold"
        >
          {formatTime("09:00", draft.format, true, {
            am: draft.amText,
            pm: draft.pmText,
          })}
        </output>
      </div>
      <StudioFormatActions
        onCancel={onCancel}
        onApply={() => {
          if (JSON.stringify(draft) === JSON.stringify(initial)) onCancel();
          else onChange(draft);
        }}
      />
    </>
  );
}

/** Cards, Timetable and other editors use the same field-driven format controls. */
export function StudioBuiltinFieldFormatControls({
  binding,
  document,
  runtimeValues,
  context,
  onChange,
}: {
  binding: Extract<StudioBinding, { kind: "builtinField" }>;
  document?: StudioTemplateDocument;
  runtimeValues?: StudioRuntimeValues;
  context?: StudioRuntimeContext;
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
          preview={
            document
              ? (template) =>
                  resolveStudioTextBinding(
                    document,
                    runtimeValues ?? createStudioInitialRuntimeValues(document),
                    {
                      ...binding,
                      dateRangeFormat: "custom",
                      dateRangeTemplate: template,
                    },
                    context,
                  )
              : undefined
          }
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
