"use client";
import { Minus, Plus } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";
import { cn } from "@/lib/utils";
import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTimetableDayDefinition,
  StudioTimetableRuntimeEntry,
  StudioTimetableStatusDefinition,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import type { StudioRuntimeContext } from "@/utils/template-studio/input-values";
import { StudioRuntimeInputGroups } from "./studio-runtime-input-panel";

export interface StudioTimetableDayPanelProps {
  /** 시간표 도메인이 없는 문서인지. 없으면 채울 것이 없다. */
  hasTimetable: boolean;
  /** order로 이미 정렬한 요일 목록. */
  days: StudioTimetableDayDefinition[];
  activeDayId: string | null;
  activeDay: StudioTimetableDayDefinition | null;
  entries: StudioTimetableRuntimeEntry[];
  activeEntryIndex: number;
  activeEntry: StudioTimetableRuntimeEntry | null;
  /** 한 요일에 넣을 수 있는 일정 수. */
  maxEntries: number;
  /** 일정을 더 넣을 수 없는 이유. 없으면 넣을 수 있다. */
  addEntryDisabledReason: string | null;
  statusOptions: StudioTimetableStatusDefinition[];
  inputsByScope: {
    global: StudioInputDefinition[];
    day: StudioInputDefinition[];
    entry: StudioInputDefinition[];
  };
  runtimeValues: StudioRuntimeValues;
  onSelectDay: (dayId: string) => void;
  onSelectEntryIndex: (entryIndex: number) => void;
  onAddEntry: () => void;
  onRemoveEntry: (dayId: string, entryIndex: number) => void;
  onUpdateEntryStatus: (
    dayId: string,
    entryIndex: number,
    statusId: StudioTimetableStatusId,
  ) => void;
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
 * 요일과 일정 편집 패널.
 *
 * 요일을 고르고, 그 요일의 일정을 늘리거나 줄이고, 고른 일정의 값을 채운다.
 * 요일을 바꾸면 일정 자리도 처음으로 돌아간다. 요일마다 일정 수가 다르므로
 * 자리를 그대로 두면 없는 일정을 가리킨 채로 남는다.
 *
 * 일정이 둘 이상인 요일에서는 상태를 바꿀 수 없다. 상태는 요일 카드 한 장의
 * 모습을 정하는 값이라, 일정이 여러 개인 요일에서는 어느 일정의 상태인지 정할 수
 * 없다. 넣을 수 없는 이유는 감추지 않고 그 자리에 알려준다.
 */
export function StudioTimetableDayPanel({
  hasTimetable,
  days,
  activeDayId,
  activeDay,
  entries,
  activeEntryIndex,
  activeEntry,
  maxEntries,
  addEntryDisabledReason,
  statusOptions,
  inputsByScope,
  runtimeValues,
  onSelectDay,
  onSelectEntryIndex,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntryStatus,
  onChangeInput,
  onRequestImageCrop,
}: StudioTimetableDayPanelProps) {
  if (!hasTimetable) {
    return (
      <div className="p-4 text-sm font-medium text-[var(--fg2)]">
        No timetable domain
      </div>
    );
  }

  const canAddEntry = addEntryDisabledReason === null;

  return (
    <div className="template-studio-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mb-3 grid gap-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          Day Cards
        </div>
        <div className="text-[12px] font-semibold text-[var(--fg)]">
          {days.length} days · {entries.length}/{maxEntries} entries
        </div>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1">
        {days.map((day) => (
          <button
            className={cn(
              "h-9 rounded-lg border text-[11px] font-bold transition",
              activeDayId === day.id
                ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--fg)]"
                : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
            )}
            key={day.id}
            type="button"
            onClick={() => onSelectDay(day.id)}
          >
            {day.shortLabel ?? day.label.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
            {activeDay?.label ?? "Day"} Entries
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canAddEntry}
            title={addEntryDisabledReason ?? "Add entry"}
            type="button"
            onClick={onAddEntry}
          >
            <Plus size={14} />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--field-border)] bg-[var(--field)] px-3 py-4 text-center text-xs font-semibold text-[var(--fg2)]">
            Empty day
          </div>
        ) : (
          <div className="grid gap-2">
            {entries.map((entry, entryIndex) => {
              const isActive = activeEntryIndex === entryIndex;

              return (
                <div
                  className={cn(
                    "grid gap-2 rounded-lg border p-2 transition",
                    isActive
                      ? "border-[var(--accent)] bg-[var(--sel)]"
                      : "border-[var(--field-border)] bg-[var(--field)]",
                  )}
                  key={entry.id}
                >
                  <button
                    className="flex items-center gap-2 text-left"
                    type="button"
                    onClick={() => onSelectEntryIndex(entryIndex)}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--panel)] text-[10px] font-extrabold text-[var(--fg2)]">
                      {entryIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-[var(--fg)]">
                      {entry.id}
                    </span>
                  </button>

                  <div className="grid grid-cols-[1fr_auto] gap-1.5">
                    <select
                      className="h-8 min-w-0 rounded-md border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                      // 일정이 여러 개면 어느 일정의 상태인지 정할 수 없다.
                      disabled={entries.length > 1}
                      value={entry.statusId}
                      onChange={(event) => {
                        if (!activeDayId) return;
                        onUpdateEntryStatus(
                          activeDayId,
                          entryIndex,
                          event.currentTarget.value as StudioTimetableStatusId,
                        );
                      }}
                    >
                      {statusOptions.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--field-border)] bg-[var(--panel)] text-[var(--fg2)] transition hover:border-rose-400/60 hover:text-rose-300"
                      title="Remove entry"
                      type="button"
                      onClick={() => {
                        if (!activeDayId) return;
                        onRemoveEntry(activeDayId, entryIndex);
                      }}
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 border-t border-[var(--border)] pt-4">
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
    </div>
  );
}
