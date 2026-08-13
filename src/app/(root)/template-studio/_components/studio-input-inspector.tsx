"use client";

import { ArrowUpRight, Plus } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import {
  StudioNumberField,
  StudioTextareaField,
  StudioTextField,
} from "@/components/studio/inspector/studio-inspector-fields";
import type {
  StudioInputDefinition,
  StudioInputScope,
  StudioSelectInputDefinition,
} from "@/types/template-studio";
import type { StudioInputConsumerReference } from "@/utils/template-studio/input-commands";

/** 글자 입력의 줄 수 범위. 너무 낮거나 높으면 편집 칸이 쓸 수 없게 된다. */
const STUDIO_TEXT_INPUT_MIN_ROWS = 2;
const STUDIO_TEXT_INPUT_MAX_ROWS = 12;
const STUDIO_TEXT_INPUT_DEFAULT_ROWS = 4;

/** 여러 줄 글자 입력의 줄 수를 쓸 수 있는 범위로 자른다. */
export const clampStudioTextInputRows = (value: number): number =>
  Math.max(
    STUDIO_TEXT_INPUT_MIN_ROWS,
    Math.min(
      STUDIO_TEXT_INPUT_MAX_ROWS,
      value || STUDIO_TEXT_INPUT_DEFAULT_ROWS,
    ),
  );

export interface StudioInputInspectorProps {
  /** 고른 입력. 없으면 안내만 보여준다. */
  input: StudioInputDefinition | null;
  /** 이 입력을 쓰는 곳 목록. */
  consumers: StudioInputConsumerReference[];
  /**
   * 지금 Inputs 탭을 보고 있는지.
   *
   * 다른 탭에서 열었을 때만 Inputs로 가는 버튼을 보여준다.
   */
  isInputPanelActive: boolean;
  onUpdateInput: (
    inputId: string,
    updater: (input: StudioInputDefinition) => StudioInputDefinition,
  ) => void;
  onJumpToInput: (inputId: string) => void;
  onJumpToConsumer: (consumer: StudioInputConsumerReference) => void;
  onAddSelectConsumer: (
    input: StudioSelectInputDefinition,
    kind: "text" | "image",
  ) => void;
  onAddSelectOption: (inputId: string) => void;
  onRemoveSelectOption: (inputId: string, optionIndex: number) => void;
  onUpdateSelectOptionLabel: (
    inputId: string,
    optionIndex: number,
    label: string,
  ) => void;
  onUpdateSelectOptionValue: (
    inputId: string,
    optionIndex: number,
    value: string,
  ) => void;
}

/**
 * 사용자 입력 하나의 속성 편집.
 *
 * 이름과 범위는 모든 종류가 함께 쓰고, 그 아래는 종류별로 갈린다. select는
 * 옵션 목록과 그 옵션을 쓰는 소비 노드를 함께 다룬다.
 *
 * 옵션의 값은 런타임 값과 노드의 옵션별 에셋 지도에서 키로 쓰이므로 값 편집은
 * 이름 편집과 다른 명령으로 따로 넘긴다.
 */
export function StudioInputInspector({
  input,
  consumers,
  isInputPanelActive,
  onUpdateInput,
  onJumpToInput,
  onJumpToConsumer,
  onAddSelectConsumer,
  onAddSelectOption,
  onRemoveSelectOption,
  onUpdateSelectOptionLabel,
  onUpdateSelectOptionValue,
}: StudioInputInspectorProps) {
  if (!input) {
    return (
      <p className="text-sm font-medium text-[#8fa6cf]">
        Select an input block.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {!isInputPanelActive ? (
        <button
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
          type="button"
          onClick={() => onJumpToInput(input.id)}
        >
          <ArrowUpRight size={12} />
          Open in Inputs
        </button>
      ) : null}

      <StudioTextField
        label="Label"
        value={input.label}
        onChange={(value) =>
          onUpdateInput(input.id, (currentInput) => ({
            ...currentInput,
            label: value,
          }))
        }
      />

      <label className="grid gap-1 text-xs font-semibold text-[#8fa6cf]">
        <span>Scope</span>
        <select
          className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
          value={input.scope}
          onChange={(event) => {
            const scope = event.currentTarget.value as StudioInputScope;
            onUpdateInput(input.id, (currentInput) => ({
              ...currentInput,
              scope,
            }));
          }}
        >
          <option value="global">Global</option>
          <option value="day">Day</option>
          <option value="entry">Entry</option>
        </select>
      </label>

      {input.type === "text" && (
        <>
          <StudioTextField
            label="Placeholder"
            value={input.placeholder ?? ""}
            onChange={(value) =>
              onUpdateInput(input.id, (currentInput) =>
                currentInput.type === "text"
                  ? { ...currentInput, placeholder: value }
                  : currentInput,
              )
            }
          />
          {input.multiline ? (
            <StudioTextareaField
              label="Default"
              rows={input.minRows ?? STUDIO_TEXT_INPUT_DEFAULT_ROWS}
              value={input.defaultValue ?? ""}
              onChange={(value) =>
                onUpdateInput(input.id, (currentInput) =>
                  currentInput.type === "text"
                    ? { ...currentInput, defaultValue: value }
                    : currentInput,
                )
              }
            />
          ) : (
            <StudioTextField
              label="Default"
              value={input.defaultValue ?? ""}
              onChange={(value) =>
                onUpdateInput(input.id, (currentInput) =>
                  currentInput.type === "text"
                    ? { ...currentInput, defaultValue: value }
                    : currentInput,
                )
              }
            />
          )}
          <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
            <span>Multiline</span>
            <input
              checked={Boolean(input.multiline)}
              className="h-4 w-4 accent-[var(--accent)]"
              type="checkbox"
              onChange={(event) =>
                onUpdateInput(input.id, (currentInput) =>
                  currentInput.type === "text"
                    ? {
                        ...currentInput,
                        multiline: event.currentTarget.checked || undefined,
                        minRows: event.currentTarget.checked
                          ? (currentInput.minRows ??
                            STUDIO_TEXT_INPUT_DEFAULT_ROWS)
                          : undefined,
                      }
                    : currentInput,
                )
              }
            />
          </label>
          {input.multiline ? (
            <StudioNumberField
              label="Rows"
              value={Number(input.minRows ?? STUDIO_TEXT_INPUT_DEFAULT_ROWS)}
              onChange={(value) =>
                onUpdateInput(input.id, (currentInput) =>
                  currentInput.type === "text"
                    ? {
                        ...currentInput,
                        minRows: clampStudioTextInputRows(value),
                      }
                    : currentInput,
                )
              }
            />
          ) : null}
          <StudioNumberField
            label="Max Length"
            value={Number(input.maxLength ?? 0)}
            onChange={(value) =>
              onUpdateInput(input.id, (currentInput) =>
                currentInput.type === "text"
                  ? {
                      ...currentInput,
                      maxLength: value > 0 ? value : undefined,
                    }
                  : currentInput,
              )
            }
          />
        </>
      )}

      {input.type === "image" && (
        <StudioTextField
          label="Default URL"
          value={input.defaultUrl ?? ""}
          onChange={(value) =>
            onUpdateInput(input.id, (currentInput) =>
              currentInput.type === "image"
                ? { ...currentInput, defaultUrl: value }
                : currentInput,
            )
          }
        />
      )}

      {input.type === "select" && (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
              type="button"
              onClick={() => onAddSelectConsumer(input, "text")}
            >
              <Plus size={12} />
              Text
            </button>
            <button
              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
              type="button"
              onClick={() => onAddSelectConsumer(input, "image")}
            >
              <Plus size={12} />
              Image
            </button>
          </div>

          <label className="grid gap-1 text-xs font-semibold text-[#8fa6cf]">
            <span>Default Option</span>
            <select
              className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
              value={input.defaultValue ?? ""}
              onChange={(event) =>
                onUpdateInput(input.id, (currentInput) =>
                  currentInput.type === "select"
                    ? {
                        ...currentInput,
                        defaultValue: event.currentTarget.value,
                      }
                    : currentInput,
                )
              }
            >
              {input.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2">
            {input.options.map((option, optionIndex) => (
              <div
                className="grid grid-cols-[1fr_1fr_auto] gap-2"
                key={option.value}
              >
                <input
                  className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
                  value={option.label}
                  onChange={(event) =>
                    onUpdateSelectOptionLabel(
                      input.id,
                      optionIndex,
                      event.currentTarget.value,
                    )
                  }
                />
                <input
                  className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
                  value={option.value}
                  onChange={(event) =>
                    onUpdateSelectOptionValue(
                      input.id,
                      optionIndex,
                      event.currentTarget.value,
                    )
                  }
                />
                <button
                  className="h-9 rounded border border-[#303848] px-3 text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230] disabled:opacity-40"
                  disabled={input.options.length <= 1}
                  type="button"
                  onClick={() => onRemoveSelectOption(input.id, optionIndex)}
                >
                  Del
                </button>
              </div>
            ))}
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded border border-[#303848] bg-[#111827] text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230]"
              type="button"
              onClick={() => onAddSelectOption(input.id)}
            >
              <Plus size={14} />
              Add option
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#8fa6cf]">
          Consumers
        </h3>
        {consumers.length > 0 ? (
          <div className="grid gap-1">
            {consumers.map((consumer) => (
              <button
                className="flex min-w-0 items-center gap-2 rounded bg-[#182131] px-2 py-1.5 text-left text-xs font-bold text-[#c8d6f2] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                key={consumer.id}
                type="button"
                onClick={() => onJumpToConsumer(consumer)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{consumer.label}</span>
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--fg3)]">
                    {consumer.detail}
                  </span>
                </span>
                <ArrowUpRight size={12} className="shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-[#8fa6cf]">No consumers</p>
        )}
      </div>
    </div>
  );
}
