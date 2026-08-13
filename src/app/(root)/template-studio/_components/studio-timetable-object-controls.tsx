"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import { StudioNumberField } from "@/components/studio/inspector/studio-inspector-fields";
import { getStudioOpacityPercent } from "@/utils/template-studio/node-style-commands";

export interface StudioTimetableVisibilityFieldProps {
  /** 지금 숨겨져 있는지. 문서는 숨김을 저장하고 화면은 보임으로 묻는다. */
  hidden?: boolean;
  onChange: (visible: boolean) => void;
}

/**
 * 시간표 객체를 보일지 정하는 토글.
 *
 * 문서에는 숨김 여부를 저장하지만 사람에게는 보임 여부로 묻는다. 목록에서 무엇이
 * 켜져 있는지 읽는 편이 자연스럽기 때문이다.
 */
export function StudioTimetableVisibilityField({
  hidden,
  onChange,
}: StudioTimetableVisibilityFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
      <span>Visible</span>
      <input
        checked={!hidden}
        className="h-4 w-4 accent-[var(--accent)]"
        type="checkbox"
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  );
}

export interface StudioTimetableOpacityFieldProps {
  /** 문서에 저장된 0~1 투명도. */
  opacity: unknown;
  /** 0~1로 되돌린 값을 받는다. */
  onChange: (opacity: number) => void;
}

/**
 * 시간표 객체의 투명도.
 *
 * 문서에는 0~1로 저장하지만 사람은 백분율로 읽고 쓴다. 범위를 벗어난 입력은
 * 0과 1 사이로 자른다.
 */
export function StudioTimetableOpacityField({
  opacity,
  onChange,
}: StudioTimetableOpacityFieldProps) {
  return (
    <StudioNumberField
      label="Opacity"
      value={getStudioOpacityPercent(opacity)}
      onChange={(value) => onChange(Math.min(Math.max(value, 0), 100) / 100)}
    />
  );
}
