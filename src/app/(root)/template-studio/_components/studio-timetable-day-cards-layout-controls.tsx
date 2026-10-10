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
  getStudioTimetableDayCardGeometries,
  getStudioTimetableDayCardsLayout,
} from "./studio-timetable-preview";

import { applyStudioTimetableGridPreset } from "@/utils/template-studio/timetable-placement";

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
  getEntryCardSize?: (dayId: StudioTimetableDayId) => {
    width: number;
    height: number;
  };
  /** 배치를 바꾼다. 문서 갱신과 이력은 호출한 쪽이 소유한다. */
  onUpdateLayout: (
    recipe: (layout: StudioTimetableDayCardsLayout) => void,
  ) => void;
}

/**
 * 요일 카드 배치 컨트롤.
 *
 * 격자 프리셋과 3x3의 빈 칸 선택, Custom의 절대 좌표 배치를 다룬다.
 *
 * 프리셋을 고르면 자리 지도를 지운다. 프리셋이 칸을 스스로 정하기 때문에
 * 이전 지도를 남겨 두면 화면과 문서가 어긋난다. Custom에서는 격자 없이
 * 캔버스 원점부터 개별 카드의 절대 좌표를 설정한다.
 */
export function StudioTimetableDayCardsLayoutControls({
  layout,
  days,
  getEntryCardSize,
  onUpdateLayout,
}: StudioTimetableDayCardsLayoutControlsProps) {
  const threeByThreeEmptySlotIndexes =
    layout.gridPreset === "3x3"
      ? getStudioTimetableThreeByThreeEmptySlotIndexes(layout, days.length)
      : [];

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

            if (!preset) return;
            const dayIds = days.map((day) => day.id);
            onUpdateLayout((nextLayout) => {
              applyStudioTimetableGridPreset(
                nextLayout,
                preset,
                dayIds,
                (candidate) =>
                  getStudioTimetableDayCardGeometries(
                    getStudioTimetableDayCardsLayout({
                      dayIds,
                      dayCardsLayout: candidate,
                    }),
                    days.map((day, order) => ({ ...day, order })),
                    () => 1,
                    getEntryCardSize,
                  ),
                (candidate) =>
                  getStudioTimetableThreeByThreeEmptySlotIndexes(
                    candidate,
                    days.length,
                  ),
              );
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

      {layout.gridPreset !== "custom" ? (
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
      ) : null}

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

      {layout.gridPreset !== "custom" ? (
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
      ) : null}

      <p className="text-[10px] leading-relaxed text-[var(--fg3)]">
        Select a day card in Layers to edit its rotation and card design. Choose
        Custom to edit individual card positions.
      </p>
      <details className="rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-2.5">
        <summary className="cursor-pointer text-[11px] font-bold text-[var(--fg)]">
          Advanced · Card Transforms
        </summary>
        <div className="mt-3 grid gap-2">
          <div className="grid gap-0.5">
            <span className="text-[11px] font-bold text-[var(--fg)]">
              Card Transforms
            </span>
            <span className="text-[9px] font-semibold leading-relaxed text-[var(--fg3)]">
              {layout.gridPreset === "custom"
                ? "Position each card from the canvas origin (0, 0)."
                : "Card positions follow the grid. Rotation can be edited independently."}
            </span>
          </div>
          {days.map((day) => {
            const offset = layout.dayOffsets?.[day.id] ?? {
              left: 0,
              top: 0,
              rotateDeg: 0,
            };

            return (
              <div className="grid gap-1.5" key={day.id}>
                <span className="text-[10px] font-bold text-[var(--fg2)]">
                  {day.label}
                </span>
                <div
                  className={cn(
                    "grid gap-2",
                    layout.gridPreset === "custom"
                      ? "grid-cols-3"
                      : "grid-cols-1",
                  )}
                >
                  {layout.gridPreset === "custom" ? (
                    <>
                      <StudioNumberField
                        label="X"
                        value={offset.left}
                        onChange={(value) =>
                          onUpdateLayout((nextLayout) => {
                            const current = nextLayout.dayOffsets?.[day.id] ?? {
                              left: 0,
                              top: 0,
                              rotateDeg: 0,
                            };
                            nextLayout.dayOffsets = {
                              ...nextLayout.dayOffsets,
                              [day.id]: { ...current, left: value },
                            };
                          })
                        }
                      />
                      <StudioNumberField
                        label="Y"
                        value={offset.top}
                        onChange={(value) =>
                          onUpdateLayout((nextLayout) => {
                            const current = nextLayout.dayOffsets?.[day.id] ?? {
                              left: 0,
                              top: 0,
                              rotateDeg: 0,
                            };
                            nextLayout.dayOffsets = {
                              ...nextLayout.dayOffsets,
                              [day.id]: { ...current, top: value },
                            };
                          })
                        }
                      />
                    </>
                  ) : null}
                  <StudioNumberField
                    label="Rotate"
                    value={offset.rotateDeg ?? 0}
                    onChange={(value) =>
                      onUpdateLayout((nextLayout) => {
                        const current = nextLayout.dayOffsets?.[day.id] ?? {
                          left: 0,
                          top: 0,
                          rotateDeg: 0,
                        };
                        nextLayout.dayOffsets = {
                          ...nextLayout.dayOffsets,
                          [day.id]: { ...current, rotateDeg: value },
                        };
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
          type="button"
          onClick={() =>
            onUpdateLayout((nextLayout) => {
              nextLayout.dayOffsets = {};
            })
          }
        >
          Reset card positions and rotations
        </button>
      </details>
    </div>
  );
}
