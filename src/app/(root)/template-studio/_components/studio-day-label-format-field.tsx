"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import type {
  StudioBuiltinFieldId,
  StudioDayLabelFormat,
  StudioTimetableDayDefinition,
} from "@/types/template-studio";
import {
  isStudioDayLabelBuiltinField,
  getStudioDayLabelTemplateValue,
  STUDIO_DAY_LABEL_FORMAT_OPTIONS,
  formatStudioDayLabel,
} from "@/utils/template-studio/builtin-fields";

import { StudioTemplateFormatEditor } from "@/components/studio/inspector/studio-template-format-editor";

export interface StudioDayLabelFormatFieldProps {
  /** 이 텍스트가 묶인 기본 필드. 요일 필드가 아니면 아무것도 그리지 않는다. */
  fieldId: StudioBuiltinFieldId;
  value?: StudioDayLabelFormat;
  template?: string;
  day?: StudioTimetableDayDefinition | null;
  onChange: (format: StudioDayLabelFormat, template: string) => void;
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
  template,
  day,
  onChange,
}: StudioDayLabelFormatFieldProps) {
  if (!isStudioDayLabelBuiltinField(fieldId)) return null;
  const templateValue = getStudioDayLabelTemplateValue(
    fieldId,
    value,
    template,
  );
  const preset = STUDIO_DAY_LABEL_FORMAT_OPTIONS.find(
    (option) => option.template === templateValue,
  );
  const exampleDay = day ?? {
    id: "mon",
    label: "Monday",
    shortLabel: "Mon",
    order: 0,
  };
  return (
    <StudioTemplateFormatEditor
      title="Day Format"
      summary={preset?.label ?? "사용자 지정"}
      template={templateValue}
      tokens={STUDIO_DAY_LABEL_FORMAT_OPTIONS.map((option) => ({
        value: option.template,
        label: option.label,
        group: "요일",
      }))}
      presets={STUDIO_DAY_LABEL_FORMAT_OPTIONS.map((option) => ({
        id: option.value,
        label: option.label,
        template: option.template,
      }))}
      preview={(draft) =>
        formatStudioDayLabel(exampleDay, fieldId, "custom", draft)
      }
      onApply={({ format, template: draft }) =>
        onChange(format as StudioDayLabelFormat, draft)
      }
    />
  );
}
