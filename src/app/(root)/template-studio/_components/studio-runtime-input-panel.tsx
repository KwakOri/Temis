"use client";
import { Upload } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";
import {
  StudioTextareaField,
  StudioTextField,
} from "@/components/studio/inspector/studio-inspector-fields";
import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTimetableDayDefinition,
  StudioTimetableRuntimeEntry,
} from "@/types/template-studio";
import {
  getStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";

/**
 * 미리보기 값을 채울 때 어느 요일과 일정을 가리키는지.
 *
 * 같은 입력이 요일마다 다른 값을 갖기 때문에, 편집 칸의 key에 문맥을 함께 넣어야
 * 요일을 바꿀 때 칸이 새로 만들어진다. 그러지 않으면 앞 요일의 값이 남는다.
 */
export const getStudioRuntimeInputKey = (
  input: StudioInputDefinition,
  context: StudioRuntimeContext,
): string =>
  [input.id, context.dayId ?? "global", context.entryIndex ?? "none"].join(":");

export interface StudioRuntimeInputFieldProps {
  input: StudioInputDefinition;
  runtimeValues: StudioRuntimeValues;
  /** 어느 요일·일정의 값을 고칠지. 비우면 전체 공통 값이다. */
  context?: StudioRuntimeContext;
  onChange: (
    input: StudioInputDefinition,
    value: string,
    context: StudioRuntimeContext,
  ) => void;
  /**
   * 사진을 고르면 자를 창을 띄운다.
   *
   * 자를 크기는 지금 고른 객체의 크기를 쓴다. 그것을 모를 때의 기본값은 호출한
   * 쪽이 정한다.
   */
  onRequestImageCrop: (
    file: File,
    onApply: (croppedImageSrc: string) => void,
  ) => void;
}

/**
 * 미리보기 값 한 칸.
 *
 * 입력 종류가 정한 칸을 그린다. 사진 입력은 주소를 직접 붙일 수도 있고 파일을
 * 올릴 수도 있다. 올린 파일은 곧바로 넣지 않고 자를 창을 지나게 한다. 템플릿이
 * 정한 자리 비율과 다른 사진이 그대로 들어가면 미리보기가 실제 결과와 달라진다.
 */
export function StudioRuntimeInputField({
  input,
  runtimeValues,
  context = {},
  onChange,
  onRequestImageCrop,
}: StudioRuntimeInputFieldProps) {
  const value = getStudioRuntimeInputValue(input, runtimeValues, context);

  if (input.type === "text") {
    if (input.multiline) {
      return (
        <StudioTextareaField
          label={input.label}
          placeholder={input.placeholder}
          rows={input.minRows}
          value={value}
          onChange={(nextValue) => onChange(input, nextValue, context)}
        />
      );
    }

    return (
      <StudioTextField
        label={input.label}
        placeholder={input.placeholder}
        value={value}
        onChange={(nextValue) => onChange(input, nextValue, context)}
      />
    );
  }

  if (input.type === "image") {
    return (
      <div className="grid gap-2">
        <StudioTextField
          label={input.label}
          placeholder={input.placeholder}
          value={value}
          onChange={(nextValue) => onChange(input, nextValue, context)}
        />
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded border border-[#303848] bg-[#111827] px-3 text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230]">
          <Upload size={14} />
          Upload
          <input
            accept="image/*"
            className="hidden"
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              // 같은 파일을 다시 골라도 이 칸이 반응해야 한다.
              event.currentTarget.value = "";
              if (!file) return;

              onRequestImageCrop(file, (croppedImageSrc) =>
                onChange(input, croppedImageSrc, context),
              );
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <label className="grid gap-1 text-xs font-semibold text-[#8fa6cf]">
      <span>{input.label}</span>
      <select
        className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
        value={value}
        onChange={(event) =>
          onChange(input, event.currentTarget.value, context)
        }
      >
        {input.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface StudioRuntimeInputGroupsProps {
  /** 범위별로 갈라 둔 입력. 범위마다 문맥이 달라서 미리 갈라 받는다. */
  inputsByScope: {
    global: StudioInputDefinition[];
    day: StudioInputDefinition[];
    entry: StudioInputDefinition[];
  };
  runtimeValues: StudioRuntimeValues;
  activeDayId: string | null;
  activeEntryIndex: number;
  /** 지금 고른 일정. 없으면 일정 범위 입력을 보여 주지 않는다. */
  activeEntry: StudioTimetableRuntimeEntry | null;
  onChangeInput: (
    input: StudioInputDefinition,
    value: string,
    context: StudioRuntimeContext,
  ) => void;
  onRequestImageCrop: (
    file: File,
    onApply: (croppedImageSrc: string) => void,
  ) => void;
}

/**
 * 범위별 미리보기 값 묶음.
 *
 * 전체 공통 값은 늘 보여 주고, 요일과 일정 범위는 볼 요일·일정이 정해졌을 때만
 * 보여 준다. 문맥 없이 그 칸을 보여 주면 어느 요일 값을 고치는지 알 수 없다.
 *
 * 비어 있는 범위는 제목까지 감춘다. 채울 것이 없는 제목만 남으면 무엇을 더
 * 해야 하는지 오해를 준다.
 */
export function StudioRuntimeInputGroups({
  inputsByScope,
  runtimeValues,
  activeDayId,
  activeEntryIndex,
  activeEntry,
  onChangeInput,
  onRequestImageCrop,
}: StudioRuntimeInputGroupsProps) {
  const renderGroup = (
    title: string,
    scopedInputs: StudioInputDefinition[],
    context: StudioRuntimeContext = {},
  ) => {
    if (scopedInputs.length === 0) return null;

    return (
      <div className="grid gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9fb5df]">
          {title}
        </h3>
        <div className="grid gap-3">
          {scopedInputs.map((input) => (
            <StudioRuntimeInputField
              context={context}
              input={input}
              key={getStudioRuntimeInputKey(input, context)}
              runtimeValues={runtimeValues}
              onChange={onChangeInput}
              onRequestImageCrop={onRequestImageCrop}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderGroup("Global", inputsByScope.global)}
      {activeDayId
        ? renderGroup("Day", inputsByScope.day, { dayId: activeDayId })
        : null}
      {activeDayId && activeEntry
        ? renderGroup("Entry", inputsByScope.entry, {
            dayId: activeDayId,
            entryIndex: activeEntryIndex,
          })
        : null}
    </>
  );
}

export interface StudioRuntimeInputPanelProps extends StudioRuntimeInputGroupsProps {
  /** order로 이미 정렬한 요일 목록. */
  days: StudioTimetableDayDefinition[];
  activeEntries: StudioTimetableRuntimeEntry[];
  onSelectDay: (dayId: string) => void;
  onSelectEntryIndex: (entryIndex: number) => void;
  onReset: () => void;
}

/**
 * 미리보기 값 편집 패널.
 *
 * 전체 공통, 요일, 일정 세 범위를 한 화면에서 채운다. 요일과 일정 범위는 어느
 * 요일·일정을 보는 중인지에 따라 값이 달라지므로, 위쪽에서 문맥을 먼저 고르고
 * 그 문맥으로 아래 칸을 채운다.
 *
 * 요일이 없는 문서에서는 문맥 고르는 칸을 감춘다. 고를 것이 없는 선택 칸은
 * 채워야 할 것이 남았다는 오해만 준다.
 */
export function StudioRuntimeInputPanel({
  inputsByScope,
  runtimeValues,
  days,
  activeDayId,
  activeEntries,
  activeEntryIndex,
  activeEntry,
  onChangeInput,
  onRequestImageCrop,
  onSelectDay,
  onSelectEntryIndex,
  onReset,
}: StudioRuntimeInputPanelProps) {
  const hasScopedInputs =
    inputsByScope.day.length > 0 || inputsByScope.entry.length > 0;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <button
          className="h-7 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-[11px] font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          type="button"
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      {hasScopedInputs && days.length > 0 ? (
        <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2">
          <label className="grid gap-1 text-[11px] font-semibold text-[var(--fg2)]">
            <span>Day Context</span>
            <select
              className="h-8 rounded-md border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              value={activeDayId ?? ""}
              onChange={(event) => onSelectDay(event.currentTarget.value)}
            >
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          {inputsByScope.entry.length > 0 ? (
            <label className="grid gap-1 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Entry Context</span>
              <select
                className="h-8 rounded-md border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                disabled={activeEntries.length === 0}
                value={activeEntryIndex}
                onChange={(event) =>
                  onSelectEntryIndex(Number(event.currentTarget.value))
                }
              >
                {activeEntries.length === 0 ? (
                  <option value={0}>No entries</option>
                ) : null}
                {activeEntries.map((entry, entryIndex) => (
                  <option key={entryIndex} value={entryIndex}>
                    Entry {entryIndex + 1} · {entry.id.slice(-6)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <StudioRuntimeInputGroups
        activeDayId={activeDayId}
        activeEntry={activeEntry}
        activeEntryIndex={activeEntryIndex}
        inputsByScope={inputsByScope}
        runtimeValues={runtimeValues}
        onChangeInput={onChangeInput}
        onRequestImageCrop={onRequestImageCrop}
      />
    </div>
  );
}
