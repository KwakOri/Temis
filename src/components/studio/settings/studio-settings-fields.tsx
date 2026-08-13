"use client";

import { Trash2, Upload } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

/** 설정 다이얼로그의 입력 필드 공통 클래스. */
export const STUDIO_SETTINGS_FIELD_CLASS =
  "h-9 min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]";

export interface StudioSettingsNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

/** 캔버스 크기처럼 설정에서 쓰는 숫자 입력. */
export function StudioSettingsNumberField({
  label,
  value,
  onChange,
}: StudioSettingsNumberFieldProps) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <input
        className={STUDIO_SETTINGS_FIELD_CLASS}
        min={1}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export interface StudioGuideLayerSettingsProps {
  /** 등록된 가이드 에셋 이름. 없으면 빈 상태로 표시한다. */
  assetLabel: string | null;
  description: string;
  removeAriaLabel: string;
  accept?: string;
  errorMessage?: string | null;
  onRemove: () => void;
  onUpload: (file: File) => void;
}

/**
 * 가이드 이미지 업로드와 제거 설정.
 *
 * 어떤 캔버스의 가이드인지는 호출한 쪽이 설명 문구로 구분한다.
 */
export function StudioGuideLayerSettings({
  assetLabel,
  description,
  removeAriaLabel,
  accept = "image/*",
  errorMessage,
  onRemove,
  onUpload,
}: StudioGuideLayerSettingsProps) {
  return (
    <div className="mt-1 grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--panel)]/45 p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="grid gap-0.5">
          <span className="text-[11px] font-bold text-[var(--fg)]">
            Guide layer
          </span>
          <span className="text-[10px] font-medium leading-4 text-[var(--fg3)]">
            {description}
          </span>
        </span>
        {assetLabel ? (
          <button
            aria-label={removeAriaLabel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:border-red-400/70 hover:text-red-300"
            title="Remove guide"
            type="button"
            onClick={onRemove}
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
      {assetLabel ? (
        <div className="truncate rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 py-2 text-[11px] font-semibold text-[var(--fg2)]">
          {assetLabel}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--field-border)] px-2.5 py-2 text-[10px] font-medium text-[var(--fg3)]">
          No guide image selected.
        </div>
      )}
      <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]">
        <Upload size={13} />
        {assetLabel ? "Replace guide" : "Upload guide"}
        <input
          accept={accept}
          className="hidden"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onUpload(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {errorMessage ? (
        <p
          aria-live="polite"
          className="text-[10px] font-semibold leading-4 text-red-400"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      <p className="text-[9px] font-medium leading-4 text-[var(--fg3)]">
        The guide is not included in previews or exported images.
      </p>
    </div>
  );
}
