"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { StudioTextAlignment } from "@/utils/template-studio/node-style-commands";
import {
  STUDIO_TEXT_WRAP_MODE_OPTIONS,
  type StudioTextWrapMode,
} from "@/utils/template-studio/text-wrap";
import {
  normalizeStudioFontWeight,
  type StudioFontWeightOption,
} from "@/utils/template-studio/web-fonts";

/**
 * 사람이 적은 글자를 숫자로 읽는다.
 *
 * 숫자로 읽을 수 없으면 `null`을 준다. 그때는 값을 바꾸지 않고 직전 값으로
 * 되돌려야 한다. 빈 값은 0으로 본다. 천 단위 쉼표는 무시한다.
 */
export const parseStudioNumberFieldValue = (
  draftValue: string,
): number | null => {
  const trimmedValue = draftValue.trim();
  const parsedValue =
    trimmedValue === "" ? 0 : Number(trimmedValue.replace(/,/g, ""));

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

/** 화면에 보여줄 숫자. 값이 숫자가 아니면 0으로 본다. */
export const getStudioNumberFieldDisplayValue = (value: number): string =>
  String(Number.isFinite(value) ? value : 0);

export interface StudioNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /**
   * 여러 개를 골랐고 값이 갈렸는지.
   *
   * 갈렸을 때 첫 번째 값을 보여주면 고른 것 전부가 그 값이라고 읽힌다. 그래서 칸을
   * 비우고 갈렸다고 알린다. 적어 넣으면 고른 것 전부에 그 값이 들어간다.
   */
  mixed?: boolean;
}

/**
 * 숫자 입력.
 *
 * 입력 중에는 사람이 적은 글자를 그대로 보여주고, 초점을 잃거나 Enter를 누를 때
 * 한 번만 값을 넘긴다. 그래서 `12.`처럼 아직 완성되지 않은 입력이 0으로
 * 튀지 않는다. 값이 한 번만 넘어가므로 초점을 받고 잃는 사이가 되돌리기 한 단위가 된다.
 * Escape는 편집을 버리고, 위아래 화살표는 1씩(Shift와 함께 10씩) 값을 올리고 내린다.
 */
export function StudioNumberField({
  label,
  value,
  onChange,
  disabled,
  mixed = false,
}: StudioNumberFieldProps) {
  const [draftValue, setDraftValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = isEditing
    ? draftValue
    : mixed
      ? ""
      : getStudioNumberFieldDisplayValue(value);
  const commitValue = useCallback(
    (nextDraftValue: string) => {
      const parsedValue = parseStudioNumberFieldValue(nextDraftValue);

      if (parsedValue === null) {
        setDraftValue(getStudioNumberFieldDisplayValue(value));
        setIsEditing(false);
        return;
      }

      onChange(parsedValue);
      setDraftValue(String(parsedValue));
      setIsEditing(false);
    },
    [onChange, value],
  );
  const nudgeValue = useCallback(
    (delta: number) => {
      const parsedDraft = isEditing
        ? parseStudioNumberFieldValue(draftValue)
        : null;
      const baseValue = parsedDraft ?? (Number.isFinite(value) ? value : 0);
      const nextValue = Number((baseValue + delta).toFixed(2));

      onChange(nextValue);
      setDraftValue(String(nextValue));
      setIsEditing(false);
    },
    [draftValue, isEditing, onChange, value],
  );

  useEffect(() => {
    if (isEditing) return;
    setDraftValue(getStudioNumberFieldDisplayValue(value));
  }, [isEditing, value]);

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <input
        className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--fg3)] disabled:opacity-70"
        disabled={disabled}
        inputMode="decimal"
        placeholder={mixed ? "Mixed" : undefined}
        type="text"
        value={displayValue}
        onBlur={(event) => commitValue(event.currentTarget.value)}
        onChange={(event) => {
          setIsEditing(true);
          setDraftValue(event.currentTarget.value);
        }}
        onFocus={(event) => {
          setIsEditing(true);
          setDraftValue(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
            return;
          }

          if (event.key === "Escape") {
            setDraftValue(getStudioNumberFieldDisplayValue(value));
            setIsEditing(false);
            event.currentTarget.blur();
            return;
          }

          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            nudgeValue(
              (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1),
            );
          }
        }}
      />
    </label>
  );
}

export interface StudioFitParentButtonProps {
  active: boolean;
  onClick: () => void;
}

/**
 * 부모를 가득 채우기 토글.
 *
 * 섹션 제목 줄에 놓이므로 클릭이 섹션 접기로 번지지 않게 막는다.
 */
export function StudioFitParentButton({
  active,
  onClick,
}: StudioFitParentButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-7 rounded-md border px-2.5 text-[10px] font-bold uppercase tracking-[0.05em] transition",
        active
          ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--accent)]"
          : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
      )}
      title={active ? "Use fixed size" : "Fill parent"}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      Fit
    </button>
  );
}

export interface StudioFontWeightFieldProps {
  options: StudioFontWeightOption[];
  value: string | number | null | undefined;
  onChange: (value: number) => void;
}

/**
 * 글자 굵기 선택.
 *
 * 폰트가 가진 굵기만 후보로 둔다. 지금 값이 후보에 없으면 가장 가까운 굵기를
 * 보여주고, 초점을 받는 순간 그 값으로 맞춰서 화면과 문서가 어긋나지 않게 한다.
 */
export function StudioFontWeightField({
  options,
  value,
  onChange,
}: StudioFontWeightFieldProps) {
  const normalizedValue = normalizeStudioFontWeight(value);
  const selectedWeight = options.reduce(
    (closest, option) =>
      Math.abs(option.value - normalizedValue) <
      Math.abs(closest.value - normalizedValue)
        ? option
        : closest,
    options[0],
  ).value;

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>Weight</span>
      <select
        className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
        value={selectedWeight}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        onFocus={() => {
          if (selectedWeight !== normalizedValue) onChange(selectedWeight);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface StudioTextAlignmentFieldProps {
  value: StudioTextAlignment;
  onChange: (value: StudioTextAlignment) => void;
}

/** 가로 정렬 선택. */
export function StudioTextAlignmentField({
  value,
  onChange,
}: StudioTextAlignmentFieldProps) {
  const options = [
    { value: "left" as const, label: "Align left", Icon: AlignLeft },
    { value: "center" as const, label: "Align center", Icon: AlignCenter },
    { value: "right" as const, label: "Align right", Icon: AlignRight },
  ];

  return (
    <div className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>Alignment</span>
      <div className="grid h-8 min-w-0 grid-cols-3 gap-0.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
        {options.map(({ value: optionValue, label, Icon }) => (
          <button
            aria-label={label}
            aria-pressed={value === optionValue}
            className={cn(
              "flex min-w-0 items-center justify-center rounded-[5px] transition",
              value === optionValue
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
            )}
            key={optionValue}
            title={label}
            type="button"
            onClick={() => onChange(optionValue)}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

export interface StudioLineBreakFieldProps {
  value: StudioTextWrapMode;
  onChange: (value: StudioTextWrapMode) => void;
}

/**
 * Auto Text의 줄바꿈 모드 선택.
 *
 * 일반 그래프 노드와 시간표 composition 오브젝트가 같은 컨트롤을 쓴다.
 */
export function StudioLineBreakField({
  value,
  onChange,
}: StudioLineBreakFieldProps) {
  const description = STUDIO_TEXT_WRAP_MODE_OPTIONS.find(
    (option) => option.value === value,
  )?.description;

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>Line Breaks</span>
      <select
        className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as StudioTextWrapMode)
        }
      >
        {STUDIO_TEXT_WRAP_MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description ? (
        <span className="text-[10px] font-medium text-[var(--fg3)]">
          {description}
        </span>
      ) : null}
    </label>
  );
}

export interface StudioTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** 한 줄 글자 입력. */
export function StudioTextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: StudioTextFieldProps) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <input
        className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export interface StudioSelectFieldOption {
  value: string;
  label: string;
}

export interface StudioSelectFieldProps {
  label: string;
  value: string;
  options: StudioSelectFieldOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 정해진 값 가운데 하나를 고르는 칸.
 *
 * 이미지 맞춤이나 넘침 처리처럼 후보가 정해진 값에 쓴다. 두 편집기가 같은 칸을 쓴다.
 */
export function StudioSelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: StudioSelectFieldProps) {
  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <select
        className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface StudioTextareaFieldProps extends StudioTextFieldProps {
  rows?: number;
}

/** 여러 줄 글자 입력. */
export function StudioTextareaField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  rows = 4,
}: StudioTextareaFieldProps) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <textarea
        className="min-h-20 resize-y rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2 text-xs font-medium text-[var(--fg)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
