"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import { StudioNumberField } from "@/components/studio/inspector/studio-inspector-fields";
import { cn } from "@/lib/utils";
import type {
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
} from "@/types/template-studio";

import {
  getStudioTimetableThreeByThreeEmptySlotIndexes,
  STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS,
} from "./studio-timetable-preview";

const STUDIO_DAY_CARD_FILL_ORDER_OPTIONS = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
] as const;

const STUDIO_DAY_CARD_ALIGN_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
] as const;

/** 요일을 앞에서부터 칸에 채운 자리 지도. 남는 칸은 빈 칸으로 둔다. */
export const createStudioDayCardSlots = (
  dayIds: StudioTimetableDayId[],
  slotCount: number,
): Array<StudioTimetableDayId | null> =>
  Array.from({ length: slotCount }, (_, index) => dayIds[index] ?? null);

/** 배치 컨트롤이 쓰는 요일 정보. */
export interface StudioDayCardsLayoutDay {
  id: StudioTimetableDayId;
  label: string;
  shortLabel?: string;
}

export interface StudioTimetableDayCardsLayoutControlsProps {
  /** 지금 문서의 요일 카드 배치. */
  layout: StudioTimetableDayCardsLayout;
  /** 문서에 있는 요일 순서. 칸 수 계산과 자리 지도의 기준이다. */
  days: StudioDayCardsLayoutDay[];
  /** 배치를 바꾼다. 문서 갱신과 이력은 호출한 쪽이 소유한다. */
  onUpdateLayout: (
    recipe: (layout: StudioTimetableDayCardsLayout) => void,
  ) => void;
}

/**
 * 요일 카드 배치 컨트롤.
 *
 * 격자 프리셋, 채우는 방향, 남는 칸 정렬, 3x3의 빈 칸 선택과 사용자 지정
 * 자리 지도를 다룬다.
 *
 * 프리셋을 고르면 자리 지도를 지운다. 프리셋이 칸을 스스로 정하기 때문에
 * 이전 지도를 남겨 두면 화면과 문서가 어긋난다. 사용자 지정일 때만 지도를
 * 만들어 둔다.
 */
export function StudioTimetableDayCardsLayoutControls({
  layout,
  days,
  onUpdateLayout,
}: StudioTimetableDayCardsLayoutControlsProps) {
  const columns = layout.columns ?? 7;
  const rows = layout.rows ?? 1;
  const slotCount = columns * rows;
  const dayIds = days.map((day) => day.id);
  const threeByThreeEmptySlotIndexes =
    layout.gridPreset === "3x3"
      ? getStudioTimetableThreeByThreeEmptySlotIndexes(layout, days.length)
      : [];
  const slots =
    layout.slots && layout.slots.length > 0
      ? Array.from(
          { length: slotCount },
          (_, index) => layout.slots?.[index] ?? null,
        )
      : createStudioDayCardSlots(dayIds, slotCount);

  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
        <span>Grid Preset</span>
        <select
          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          value={layout.gridPreset ?? "1x7"}
          onChange={(event) => {
            const gridPreset = event.currentTarget
              .value as StudioTimetableDayCardsLayout["gridPreset"];
            const preset = STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS.find(
              (candidate) => candidate.id === gridPreset,
            );

            onUpdateLayout((nextLayout) => {
              nextLayout.gridPreset = gridPreset;
              if (preset) {
                nextLayout.columns = preset.columns;
                nextLayout.rows = Math.max(
                  preset.rows,
                  Math.ceil(days.length / preset.columns),
                );
              }

              if (gridPreset === "custom") {
                nextLayout.slots = createStudioDayCardSlots(
                  dayIds,
                  (nextLayout.columns ?? columns) * (nextLayout.rows ?? rows),
                );
              } else {
                nextLayout.slots = undefined;
              }
              nextLayout.emptySlotIndexes =
                gridPreset === "3x3"
                  ? getStudioTimetableThreeByThreeEmptySlotIndexes(
                      nextLayout,
                      days.length,
                    )
                  : undefined;
            });
          }}
        >
          {STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Fill Order</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            value={layout.fillOrder ?? "row"}
            onChange={(event) => {
              const fillOrder = event.currentTarget
                .value as StudioTimetableDayCardsLayout["fillOrder"];
              onUpdateLayout((nextLayout) => {
                nextLayout.fillOrder = fillOrder;
                if (nextLayout.gridPreset !== "custom") {
                  nextLayout.slots = undefined;
                }
              });
            }}
          >
            {STUDIO_DAY_CARD_FILL_ORDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Remainder</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            disabled={layout.gridPreset === "3x3"}
            title={
              layout.gridPreset === "3x3"
                ? "Controlled by the empty cell selector"
                : undefined
            }
            value={layout.alignLastRow ?? "start"}
            onChange={(event) => {
              const alignLastRow = event.currentTarget
                .value as StudioTimetableDayCardsLayout["alignLastRow"];
              onUpdateLayout((nextLayout) => {
                nextLayout.alignLastRow = alignLastRow;
                if (nextLayout.gridPreset !== "custom") {
                  nextLayout.slots = undefined;
                }
              });
            }}
          >
            {STUDIO_DAY_CARD_ALIGN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {layout.gridPreset === "3x3" ? (
        <div className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-2.5">
          <div className="grid gap-0.5">
            <span className="text-[11px] font-bold text-[var(--fg)]">
              Empty Cells
            </span>
            <span className="text-[9px] font-semibold leading-relaxed text-[var(--fg3)]">
              Click the two cells to leave empty. A new choice replaces the
              oldest empty cell.
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }, (_, slotIndex) => {
              const emptySlotOrder =
                threeByThreeEmptySlotIndexes.indexOf(slotIndex);
              const isEmpty = emptySlotOrder >= 0;

              return (
                <button
                  aria-label={
                    isEmpty
                      ? `Grid cell ${slotIndex + 1} is empty`
                      : `Leave grid cell ${slotIndex + 1} empty`
                  }
                  aria-pressed={isEmpty}
                  className={cn(
                    "relative flex h-12 items-center justify-center rounded-lg border text-[10px] font-bold transition",
                    isEmpty
                      ? "border-dashed border-[var(--accent)] bg-[var(--sel)] text-[var(--accent)]"
                      : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
                  )}
                  key={slotIndex}
                  title={
                    isEmpty
                      ? "Click to keep this empty cell for the next replacement"
                      : "Leave this cell empty"
                  }
                  type="button"
                  onClick={() => {
                    onUpdateLayout((nextLayout) => {
                      const currentEmptySlotIndexes =
                        getStudioTimetableThreeByThreeEmptySlotIndexes(
                          nextLayout,
                          days.length,
                        );
                      if (currentEmptySlotIndexes.length === 0) return;

                      nextLayout.emptySlotIndexes =
                        currentEmptySlotIndexes.includes(slotIndex)
                          ? [
                              ...currentEmptySlotIndexes.filter(
                                (index) => index !== slotIndex,
                              ),
                              slotIndex,
                            ]
                          : [...currentEmptySlotIndexes.slice(1), slotIndex];
                      nextLayout.slots = undefined;
                    });
                  }}
                >
                  <span className="absolute left-1.5 top-1 text-[8px] font-bold text-[var(--fg3)]">
                    {slotIndex + 1}
                  </span>
                  {isEmpty ? `Empty ${emptySlotOrder + 1}` : "Card"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {layout.gridPreset === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <StudioNumberField
            label="Columns"
            value={columns}
            onChange={(value) =>
              onUpdateLayout((nextLayout) => {
                const nextColumns = Math.max(1, Math.round(value));
                const nextRows = Math.max(
                  nextLayout.rows ?? rows,
                  Math.ceil(days.length / nextColumns),
                );
                nextLayout.columns = nextColumns;
                nextLayout.rows = nextRows;
                nextLayout.slots = createStudioDayCardSlots(
                  dayIds,
                  nextColumns * nextRows,
                );
              })
            }
          />
          <StudioNumberField
            label="Rows"
            value={rows}
            onChange={(value) =>
              onUpdateLayout((nextLayout) => {
                const nextRows = Math.max(1, Math.round(value));
                const nextColumns = Math.max(
                  nextLayout.columns ?? columns,
                  Math.ceil(days.length / nextRows),
                );
                nextLayout.columns = nextColumns;
                nextLayout.rows = nextRows;
                nextLayout.slots = createStudioDayCardSlots(
                  dayIds,
                  nextColumns * nextRows,
                );
              })
            }
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <StudioNumberField
          label="Gap X"
          value={layout.columnGap ?? layout.dayGap}
          onChange={(value) =>
            onUpdateLayout((nextLayout) => {
              nextLayout.columnGap = value;
              nextLayout.dayGap = value;
            })
          }
        />
        <StudioNumberField
          label="Gap Y"
          value={layout.rowGap ?? layout.dayGap}
          onChange={(value) =>
            onUpdateLayout((nextLayout) => {
              nextLayout.rowGap = value;
            })
          }
        />
      </div>

      {layout.gridPreset === "custom" ? (
        <div className="grid gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--fg2)]">
            Slot Map
          </span>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {slots.map((slotDayId, slotIndex) => (
              <select
                className="h-8 min-w-0 rounded-md border border-[var(--field-border)] bg-[var(--field)] px-1 text-[10px] font-bold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                key={slotIndex}
                value={slotDayId ?? ""}
                onChange={(event) => {
                  const nextDayId = event.currentTarget.value || null;
                  onUpdateLayout((nextLayout) => {
                    const nextSlots = Array.from(
                      { length: slotCount },
                      (_, index) => nextLayout.slots?.[index] ?? null,
                    );

                    // 같은 요일이 두 칸을 차지하지 않게 이전 자리를 비운다.
                    nextSlots.forEach((currentDayId, index) => {
                      if (nextDayId && currentDayId === nextDayId) {
                        nextSlots[index] = null;
                      }
                    });
                    nextSlots[slotIndex] =
                      nextDayId as StudioTimetableDayId | null;

                    nextLayout.gridPreset = "custom";
                    nextLayout.slots = nextSlots;
                  });
                }}
              >
                <option value="">Empty</option>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.shortLabel ?? day.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
      ) : null}

      <button
        className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
        type="button"
        onClick={() =>
          onUpdateLayout((nextLayout) => {
            nextLayout.dayOffsets = {};
          })
        }
      >
        Reset card offsets
      </button>
    </div>
  );
}
