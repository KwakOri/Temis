"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import type {
  StudioBuiltinFieldId,
  StudioDayLabelFormat,
} from "@/types/template-studio";
import {
  isStudioDayLabelBuiltinField,
  normalizeStudioDayLabelFormat,
  STUDIO_DAY_LABEL_FORMAT_OPTIONS,
} from "@/utils/template-studio/builtin-fields";

export interface StudioDayLabelFormatFieldProps {
  /** 이 텍스트가 묶인 기본 필드. 요일 필드가 아니면 아무것도 그리지 않는다. */
  fieldId: StudioBuiltinFieldId;
  value?: StudioDayLabelFormat;
  onChange: (format: StudioDayLabelFormat) => void;
}

/**
 * 요일 표기 방식 선택.
 *
 * 요일 기본 필드에 묶인 텍스트에만 나타난다. 고른 값은 이 바인딩에만 저장되고
 * 다른 텍스트로 퍼지지 않는다.
 */
export function StudioDayLabelFormatField({
  fieldId,
  value,
  onChange,
}: StudioDayLabelFormatFieldProps) {
  if (!isStudioDayLabelBuiltinField(fieldId)) return null;

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>Day Format</span>
      <select
        className="h-8 w-full min-w-0 max-w-full rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
        value={normalizeStudioDayLabelFormat(value)}
        onChange={(event) =>
          onChange(event.currentTarget.value as StudioDayLabelFormat)
        }
      >
        {STUDIO_DAY_LABEL_FORMAT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} · {option.preview}
          </option>
        ))}
      </select>
      <span className="text-[10px] font-medium leading-relaxed text-[var(--fg3)]">
        Stored on this text binding only.
      </span>
    </label>
  );
}
