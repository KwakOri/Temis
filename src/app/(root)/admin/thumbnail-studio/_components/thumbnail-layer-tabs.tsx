"use client";

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  CalendarDays,
  Eye,
  EyeOff,
  Group,
  ImagePlus,
  Lock,
  LocateFixed,
  Pencil,
  Search,
  Trash2,
  Ungroup,
  Unlock,
  Upload,
} from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode, useMemo, useRef, useState } from "react";

import { StudioText } from "@/components/studio/text/studio-text";
import { StudioLayerPanelFrame } from "@/components/studio/layers/studio-layer-primitives";
import { StudioNodeTypeIcon } from "@/components/studio/node-type-icon";
import type {
  StudioGraphNode,
  StudioGraphNodeType,
  StudioAsset,
  StudioInputDefinition,
  StudioInputType,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioInputDefaultValue } from "@/utils/template-studio/input-values";
import { getStudioInputTypeLabel } from "@/utils/template-studio/input-commands";
import {
  getThumbnailStudioInputGroups,
  getThumbnailStudioInputGroupId,
} from "@/utils/thumbnail-studio/input-order";
import {
  getStudioImageInputPolicy,
  normalizeStudioImageInputPolicy,
} from "@/utils/thumbnail-studio/image-input-policy";
import type { ThumbnailStudioInputConsumerReference } from "@/utils/thumbnail-studio/input-consumers";
import type { ThumbnailStudioAssetConsumerReference } from "@/utils/thumbnail-studio/asset-consumers";
import {
  getThumbnailStudioAssetStorageStatus,
  THUMBNAIL_STUDIO_ASSET_ACCEPT,
} from "@/utils/thumbnail-studio/asset-policy";
import {
  getStudioNodeDefinitions,
  type StudioNodeDefinition,
} from "@/utils/template-studio/node-definitions";
import { resolveStudioTextAppearance } from "@/utils/template-studio/text-appearance";
import type { StudioTextEffectPreset } from "@/utils/thumbnail-studio/text-effect-presets";

export interface ThumbnailAddMenuProps {
  onAddNode: (type: StudioGraphNodeType) => void;
  onAddWeekDates?: () => void;
}

/**
 * 노드 추가 메뉴.
 *
 * 목록과 순서, 이름, 아이콘을 모두 노드 정의표에서 만든다. 화면에 문자열 배열을 따로
 * 적으면 정의표에 종류를 더해도 메뉴에 나타나지 않고, 그 사실을 아무것도 알려주지 않는다.
 *
 * 탭 위에 둔다. 어느 탭을 보고 있어도 객체를 넣을 수 있어야 한다.
 */
export function ThumbnailAddMenu({
  onAddNode,
  onAddWeekDates,
}: ThumbnailAddMenuProps) {
  return (
    <div className="border-b border-[var(--border)] px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
        Insert
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {getStudioNodeDefinitions().map((definition: StudioNodeDefinition) => (
          <button
            className="flex h-10 items-center justify-center rounded-[9px] border border-[var(--field-border)] bg-[var(--field)] text-xs font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            data-thumbnail-add-node={definition.type}
            key={definition.type}
            title={`Add ${definition.addMenuLabel}`}
            type="button"
            onClick={() => onAddNode(definition.type)}
          >
            <StudioNodeTypeIcon size={17} type={definition.type} />
          </button>
        ))}
      </div>
      <button
        className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] border border-[var(--accent)] bg-[var(--sel)] text-[11px] font-bold text-[var(--fg)] transition hover:bg-[var(--hover)]"
        data-thumbnail-add-preset="weekDates"
        title="Add Week Dates"
        type="button"
        onClick={() => onAddWeekDates?.()}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Week Dates
      </button>
    </div>
  );
}

export interface ThumbnailLayerCommandBarProps {
  /** 고른 것이 없으면 명령을 누를 수 없다. */
  hasSelection: boolean;
  /** 고른 것 가운데 묶음이 있는지. 그룹 해제는 그때만 뜻이 있다. */
  hasGroupSelection: boolean;
  /** 여러 개를 골랐는지. 묶기는 그때만 뜻이 있다. */
  hasMultiSelection: boolean;
  isLocked: boolean;
  isHidden: boolean;
  onMoveLayer: (command: "forward" | "backward" | "front" | "back") => void;
  onGroup: () => void;
  onUngroup: () => void;
  onToggleLock: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}

const COMMAND_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-md border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40";

const ThumbnailLayerCommandButton = ({
  disabled,
  icon,
  title,
  onClick,
}: {
  disabled: boolean;
  icon: ReactNode;
  title: string;
  onClick: () => void;
}) => (
  <button
    className={COMMAND_BUTTON_CLASS}
    disabled={disabled}
    title={title}
    type="button"
    onClick={onClick}
  >
    {icon}
  </button>
);

/**
 * 레이어 명령 줄.
 *
 * 순서 바꾸기, 묶기, 잠금, 숨김, 삭제를 한 줄에 둔다. 지금 고른 것으로 할 수 없는
 * 명령은 누를 수 없게 한다. 눌러도 아무 일이 없으면 사용자는 기능이 고장난 것으로 읽는다.
 */
export function ThumbnailLayerCommandBar({
  hasSelection,
  hasGroupSelection,
  hasMultiSelection,
  isLocked,
  isHidden,
  onMoveLayer,
  onGroup,
  onUngroup,
  onToggleLock,
  onToggleHidden,
  onDelete,
}: ThumbnailLayerCommandBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] px-3 py-2"
      data-thumbnail-layer-commands="true"
    >
      <ThumbnailLayerCommandButton
        disabled={!hasSelection}
        icon={<ArrowUp className="h-3.5 w-3.5" />}
        title="Bring forward"
        onClick={() => onMoveLayer("forward")}
      />
      <ThumbnailLayerCommandButton
        disabled={!hasSelection}
        icon={<ArrowDown className="h-3.5 w-3.5" />}
        title="Send backward"
        onClick={() => onMoveLayer("backward")}
      />
      <ThumbnailLayerCommandButton
        disabled={!hasSelection}
        icon={<ArrowUpToLine className="h-3.5 w-3.5" />}
        title="Bring to front"
        onClick={() => onMoveLayer("front")}
      />
      <ThumbnailLayerCommandButton
        disabled={!hasSelection}
        icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
        title="Send to back"
        onClick={() => onMoveLayer("back")}
      />
      <span className="mx-0.5 h-5 w-px bg-[var(--border)]" />
      <ThumbnailLayerCommandButton
        disabled={!hasMultiSelection}
        icon={<Group className="h-3.5 w-3.5" />}
        title="Group selection"
        onClick={onGroup}
      />
      <ThumbnailLayerCommandButton
        disabled={!hasGroupSelection}
        icon={<Ungroup className="h-3.5 w-3.5" />}
        title="Ungroup selection"
        onClick={onUngroup}
      />
      <span className="mx-0.5 h-5 w-px bg-[var(--border)]" />
      <ThumbnailLayerCommandButton
        disabled={!hasSelection}
        icon={
          isLocked ? (
            <Unlock className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )
        }
        title={isLocked ? "Unlock selection" : "Lock selection"}
        onClick={onToggleLock}
      />
      <ThumbnailLayerCommandButton
        disabled={!hasSelection}
        icon={
          isHidden ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )
        }
        title={isHidden ? "Show selection" : "Hide selection"}
        onClick={onToggleHidden}
      />
      <ThumbnailLayerCommandButton
        disabled={!hasSelection}
        icon={<Trash2 className="h-3.5 w-3.5" />}
        title="Delete selection"
        onClick={onDelete}
      />
    </div>
  );
}

export interface ThumbnailPlaceholderTabProps {
  title: string;
  summary: string;
  description: string;
}

/**
 * 다음 단계에서 채울 탭.
 *
 * 빈 화면만 보여주면 아직 만들지 않은 것인지 고장난 것인지 알 수 없다. 무엇이 언제
 * 오는지 적어 둔다.
 */
export function ThumbnailPlaceholderTab({
  title,
  summary,
  description,
}: ThumbnailPlaceholderTabProps) {
  return (
    <StudioLayerPanelFrame summary={summary} title={title}>
      <p className="px-2 text-[11px] font-medium leading-5 text-[var(--fg3)]">
        {description}
      </p>
    </StudioLayerPanelFrame>
  );
}

export interface ThumbnailInputPanelProps {
  document: StudioTemplateDocument;
  selectedInputId: string | null;
  previewValues: StudioRuntimeValues;
  consumers: Record<string, ThumbnailStudioInputConsumerReference[]>;
  onSelectInput: (inputId: string | null) => void;
  onAdd: (type: StudioInputType) => void;
  onUpdate: (
    inputId: string,
    updater: (input: StudioInputDefinition) => StudioInputDefinition,
  ) => void;
  onSelectOptionValue: (
    inputId: string,
    optionIndex: number,
    value: string,
  ) => void;
  onAddOption: (inputId: string) => void;
  onRemoveOption: (inputId: string, optionIndex: number) => void;
  onDuplicate: (inputId: string) => void;
  onDelete: (inputId: string) => void;
  onMove: (inputId: string, targetIndex: number) => void;
  onSetGroup: (inputId: string, groupId: string | null) => void;
  onRenameGroup: (fromGroupId: string, toGroupId: string) => void;
  onPreviewChange: (inputId: string, value: string) => void;
  onResetPreview: (inputId?: string) => void;
}

const INPUT_FIELD_CLASS =
  "h-8 min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]";
const INPUT_TEXTAREA_CLASS =
  "min-h-16 min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]";

const ThumbnailInputLabel = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="grid min-w-0 gap-1 text-[10px] font-semibold text-[var(--fg2)]">
    <span>{label}</span>
    {children}
  </label>
);

const getPreviewValue = (
  input: StudioInputDefinition,
  values: StudioRuntimeValues,
) => values.global?.[input.id] ?? getStudioInputDefaultValue(input);

/** Thumbnail에서만 쓰는 global input 편집/preview 패널. */
export function ThumbnailInputPanel({
  document,
  selectedInputId,
  previewValues,
  consumers,
  onSelectInput,
  onAdd,
  onUpdate,
  onSelectOptionValue,
  onAddOption,
  onRemoveOption,
  onDuplicate,
  onDelete,
  onMove,
  onSetGroup,
  onRenameGroup,
  onPreviewChange,
  onResetPreview,
}: ThumbnailInputPanelProps) {
  const groups = getThumbnailStudioInputGroups(document);
  const allGroups = groups
    .map((group) => group.groupId)
    .filter((groupId): groupId is string => Boolean(groupId));

  return (
    <StudioLayerPanelFrame
      summary={`${Object.keys(document.inputs).length} global inputs`}
      title="Thumbnail Inputs"
    >
      <div className="grid gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          {(["text", "select", "image"] as StudioInputType[]).map((type) => (
            <button
              className="h-8 rounded-lg border border-[var(--accent)] bg-[var(--sel)] text-[10px] font-bold text-[var(--fg)] hover:bg-[var(--hover)]"
              data-thumbnail-input-add={type}
              key={type}
              type="button"
              onClick={() => onAdd(type)}
            >
              + {getStudioInputTypeLabel(type)}
            </button>
          ))}
        </div>
        {groups.length === 0 ? (
          <p className="px-1 text-[10px] leading-4 text-[var(--fg3)]">
            Add a text, select, or image input. Thumbnail inputs are global
            only.
          </p>
        ) : null}
        {groups.map((group) => (
          <div className="grid gap-1.5" key={group.groupId ?? "ungrouped"}>
            <div className="flex items-center gap-1.5 px-1">
              {group.groupId ? (
                <input
                  aria-label={`${group.groupId} group name`}
                  className="h-6 min-w-0 flex-1 bg-transparent text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg2)] outline-none"
                  defaultValue={group.groupId}
                  onBlur={(event) => {
                    const next = event.currentTarget.value.trim();
                    if (next && next !== group.groupId) {
                      onRenameGroup(group.groupId as string, next);
                    }
                  }}
                />
              ) : (
                <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                  Ungrouped
                </span>
              )}
              <span className="text-[10px] text-[var(--fg3)]">
                {group.inputs.length}
              </span>
            </div>
            {group.inputs.map((input, inputIndex) => {
              const inputConsumers = consumers[input.id] ?? [];
              const previewValue = getPreviewValue(input, previewValues);
              const isSelected = selectedInputId === input.id;
              const imagePolicy =
                input.type === "image"
                  ? getStudioImageInputPolicy(input.policy)
                  : null;
              return (
                <div
                  className={`grid gap-2 rounded-xl border p-2 ${isSelected ? "border-[var(--accent)] bg-[var(--sel)]" : "border-[var(--field-border)] bg-[var(--field-bg)]"}`}
                  data-thumbnail-input-id={input.id}
                  key={input.id}
                  onClick={() => onSelectInput(input.id)}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <input
                      aria-label={`${input.label} label`}
                      className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-xs font-bold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                      value={input.label}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onUpdate(input.id, (current) => ({
                          ...current,
                          label: event.currentTarget.value,
                        }))
                      }
                    />
                    <span className="rounded bg-[var(--field)] px-1.5 py-1 text-[9px] font-bold uppercase text-[var(--fg3)]">
                      {getStudioInputTypeLabel(input.type)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ThumbnailInputLabel label="Description">
                      <input
                        className={INPUT_FIELD_CLASS}
                        value={input.description ?? ""}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onUpdate(input.id, (current) => ({
                            ...current,
                            description: event.currentTarget.value || undefined,
                          }))
                        }
                      />
                    </ThumbnailInputLabel>
                    <ThumbnailInputLabel label="Help text">
                      <input
                        className={INPUT_FIELD_CLASS}
                        value={input.presentation?.helpText ?? ""}
                        onChange={(event) =>
                          onUpdate(input.id, (current) => ({
                            ...current,
                            presentation: {
                              ...(current.presentation ?? {}),
                              helpText: event.currentTarget.value || undefined,
                            },
                          }))
                        }
                      />
                    </ThumbnailInputLabel>
                    <ThumbnailInputLabel label="Group">
                      <select
                        className={INPUT_FIELD_CLASS}
                        value={getThumbnailStudioInputGroupId(input) ?? ""}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onSetGroup(
                            input.id,
                            event.currentTarget.value || null,
                          )
                        }
                      >
                        <option value="">Ungrouped</option>
                        {allGroups.map((groupId) => (
                          <option key={groupId} value={groupId}>
                            {groupId}
                          </option>
                        ))}
                        <option value="__new__">New group…</option>
                      </select>
                    </ThumbnailInputLabel>
                    <label className="flex items-end gap-1.5 pb-1 text-[10px] font-semibold text-[var(--fg2)]">
                      <input
                        checked={Boolean(input.required)}
                        type="checkbox"
                        onChange={(event) =>
                          onUpdate(input.id, (current) => ({
                            ...current,
                            required: event.currentTarget.checked,
                          }))
                        }
                      />
                      Required
                    </label>
                  </div>
                  {input.type === "text" ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <ThumbnailInputLabel label="Default">
                        <input
                          className={INPUT_FIELD_CLASS}
                          value={input.defaultValue ?? ""}
                          onChange={(event) =>
                            onUpdate(input.id, (current) =>
                              current.type === "text"
                                ? {
                                    ...current,
                                    defaultValue: event.currentTarget.value,
                                  }
                                : current,
                            )
                          }
                        />
                      </ThumbnailInputLabel>
                      <ThumbnailInputLabel label="Placeholder">
                        <input
                          className={INPUT_FIELD_CLASS}
                          value={input.placeholder ?? ""}
                          onChange={(event) =>
                            onUpdate(input.id, (current) =>
                              current.type === "text"
                                ? {
                                    ...current,
                                    placeholder: event.currentTarget.value,
                                  }
                                : current,
                            )
                          }
                        />
                      </ThumbnailInputLabel>
                      <ThumbnailInputLabel label="Max length">
                        <input
                          className={INPUT_FIELD_CLASS}
                          inputMode="numeric"
                          type="number"
                          value={input.maxLength ?? ""}
                          onChange={(event) =>
                            onUpdate(input.id, (current) =>
                              current.type === "text"
                                ? {
                                    ...current,
                                    maxLength: event.currentTarget.value
                                      ? Number(event.currentTarget.value)
                                      : undefined,
                                  }
                                : current,
                            )
                          }
                        />
                      </ThumbnailInputLabel>
                      <ThumbnailInputLabel label="Min rows">
                        <input
                          className={INPUT_FIELD_CLASS}
                          inputMode="numeric"
                          min={1}
                          type="number"
                          value={input.minRows ?? ""}
                          onChange={(event) =>
                            onUpdate(input.id, (current) =>
                              current.type === "text"
                                ? {
                                    ...current,
                                    minRows: event.currentTarget.value
                                      ? Number(event.currentTarget.value)
                                      : undefined,
                                  }
                                : current,
                            )
                          }
                        />
                      </ThumbnailInputLabel>
                      <label className="flex items-end gap-1.5 pb-1 text-[10px] font-semibold text-[var(--fg2)]">
                        <input
                          checked={Boolean(input.multiline)}
                          type="checkbox"
                          onChange={(event) =>
                            onUpdate(input.id, (current) =>
                              current.type === "text"
                                ? {
                                    ...current,
                                    multiline: event.currentTarget.checked,
                                  }
                                : current,
                            )
                          }
                        />
                        Multiline
                      </label>
                    </div>
                  ) : null}
                  {input.type === "image" ? (
                    <div
                      className="grid gap-1.5"
                      data-thumbnail-image-input-policy="true"
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        <ThumbnailInputLabel label="Default URL">
                          <input
                            className={INPUT_FIELD_CLASS}
                            placeholder={input.placeholder}
                            value={input.defaultUrl ?? ""}
                            onChange={(event) =>
                              onUpdate(input.id, (current) =>
                                current.type === "image"
                                  ? {
                                      ...current,
                                      defaultUrl: event.currentTarget.value,
                                    }
                                  : current,
                              )
                            }
                          />
                        </ThumbnailInputLabel>
                        <ThumbnailInputLabel label="Placeholder">
                          <input
                            className={INPUT_FIELD_CLASS}
                            value={input.placeholder ?? ""}
                            onChange={(event) =>
                              onUpdate(input.id, (current) =>
                                current.type === "image"
                                  ? {
                                      ...current,
                                      placeholder: event.currentTarget.value,
                                    }
                                  : current,
                              )
                            }
                          />
                        </ThumbnailInputLabel>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-1.5">
                        <span className="col-span-2 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                          Runtime image policy
                        </span>
                        {(
                          [
                            ["allowReplace", "Allow replace"],
                            ["allowFitChange", "Allow fit change"],
                            ["allowFocusChange", "Allow focus change"],
                            ["allowCrop", "Allow crop"],
                          ] as const
                        ).map(([key, label]) => (
                          <label
                            className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--fg2)]"
                            key={key}
                          >
                            <input
                              checked={imagePolicy?.[key] ?? true}
                              type="checkbox"
                              onChange={(event) =>
                                onUpdate(input.id, (current) =>
                                  current.type === "image"
                                    ? {
                                        ...current,
                                        policy: normalizeStudioImageInputPolicy(
                                          {
                                            ...getStudioImageInputPolicy(
                                              current.policy,
                                            ),
                                            [key]: event.currentTarget.checked,
                                          },
                                        ),
                                      }
                                    : current,
                                )
                              }
                            />
                            {label}
                          </label>
                        ))}
                        <ThumbnailInputLabel label="Recommended aspect ratio">
                          <input
                            className={INPUT_FIELD_CLASS}
                            inputMode="decimal"
                            min={0}
                            step="any"
                            type="number"
                            value={imagePolicy?.recommendedAspectRatio ?? ""}
                            onChange={(event) =>
                              onUpdate(input.id, (current) => {
                                if (current.type !== "image") return current;
                                const raw = event.currentTarget.value.trim();
                                const recommendedAspectRatio = raw
                                  ? Number(raw)
                                  : undefined;
                                return {
                                  ...current,
                                  policy: normalizeStudioImageInputPolicy({
                                    ...getStudioImageInputPolicy(
                                      current.policy,
                                    ),
                                    recommendedAspectRatio,
                                  }),
                                };
                              })
                            }
                          />
                        </ThumbnailInputLabel>
                      </div>
                    </div>
                  ) : null}
                  {input.type === "select" ? (
                    <div className="grid gap-1.5">
                      <ThumbnailInputLabel label="Default option">
                        <select
                          className={INPUT_FIELD_CLASS}
                          value={
                            input.defaultValue ?? input.options[0]?.value ?? ""
                          }
                          onChange={(event) =>
                            onUpdate(input.id, (current) =>
                              current.type === "select"
                                ? {
                                    ...current,
                                    defaultValue: event.currentTarget.value,
                                  }
                                : current,
                            )
                          }
                        >
                          {input.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </ThumbnailInputLabel>
                      {input.options.map((option, optionIndex) => (
                        <div
                          className="grid grid-cols-[1fr_1fr_auto] gap-1"
                          key={`${input.id}:${option.value}`}
                        >
                          <input
                            aria-label={`${option.label} value`}
                            className={INPUT_FIELD_CLASS}
                            value={option.value}
                            onChange={(event) =>
                              onSelectOptionValue(
                                input.id,
                                optionIndex,
                                event.currentTarget.value,
                              )
                            }
                          />
                          <input
                            aria-label={`${option.label} label`}
                            className={INPUT_FIELD_CLASS}
                            value={option.label}
                            onChange={(event) =>
                              onUpdate(input.id, (current) =>
                                current.type === "select"
                                  ? {
                                      ...current,
                                      options: current.options.map(
                                        (item, index) =>
                                          index === optionIndex
                                            ? {
                                                ...item,
                                                label:
                                                  event.currentTarget.value,
                                              }
                                            : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                          <button
                            className="h-8 rounded-md border border-[var(--field-border)] px-2 text-[10px] text-[var(--fg2)] disabled:opacity-40"
                            disabled={input.options.length <= 1}
                            type="button"
                            onClick={() =>
                              onRemoveOption(input.id, optionIndex)
                            }
                          >
                            −
                          </button>
                        </div>
                      ))}
                      <button
                        className="h-7 rounded-md border border-dashed border-[var(--field-border)] text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)]"
                        type="button"
                        onClick={() => onAddOption(input.id)}
                      >
                        + Add option
                      </button>
                    </div>
                  ) : null}
                  <div className="grid gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                        Preview value
                      </span>
                      <button
                        className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                        type="button"
                        onClick={() => onResetPreview(input.id)}
                      >
                        Reset
                      </button>
                    </div>
                    {input.type === "select" ? (
                      <select
                        className={INPUT_FIELD_CLASS}
                        value={previewValue}
                        onChange={(event) =>
                          onPreviewChange(input.id, event.currentTarget.value)
                        }
                      >
                        {input.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : input.type === "text" && input.multiline ? (
                      <textarea
                        className={INPUT_TEXTAREA_CLASS}
                        placeholder={input.placeholder}
                        rows={input.minRows ?? 3}
                        value={previewValue}
                        onChange={(event) =>
                          onPreviewChange(input.id, event.currentTarget.value)
                        }
                      />
                    ) : (
                      <input
                        className={INPUT_FIELD_CLASS}
                        placeholder={input.placeholder}
                        type={input.type === "image" ? "url" : "text"}
                        value={previewValue}
                        onChange={(event) =>
                          onPreviewChange(input.id, event.currentTarget.value)
                        }
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--fg3)]">
                    <span>
                      {inputConsumers.length} consumer
                      {inputConsumers.length === 1 ? "" : "s"}
                      {input.required ? " · required" : ""}
                    </span>
                    <span className="flex gap-1">
                      <button
                        className="rounded border border-[var(--field-border)] px-1.5 py-0.5 font-semibold hover:border-[var(--accent)]"
                        type="button"
                        onClick={() =>
                          onMove(
                            input.id,
                            group.firstInputIndex + inputIndex - 1,
                          )
                        }
                      >
                        ↑
                      </button>
                      <button
                        className="rounded border border-[var(--field-border)] px-1.5 py-0.5 font-semibold hover:border-[var(--accent)]"
                        type="button"
                        onClick={() =>
                          onMove(
                            input.id,
                            group.firstInputIndex + inputIndex + 1,
                          )
                        }
                      >
                        ↓
                      </button>
                      <button
                        className="rounded border border-[var(--field-border)] px-1.5 py-0.5 font-semibold hover:border-[var(--accent)]"
                        type="button"
                        onClick={() => onDuplicate(input.id)}
                      >
                        Copy
                      </button>
                      <button
                        className="rounded border border-[var(--field-border)] px-1.5 py-0.5 font-semibold text-red-300 hover:border-red-300"
                        type="button"
                        onClick={() => onDelete(input.id)}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </StudioLayerPanelFrame>
  );
}

export interface ThumbnailAssetPanelProps {
  assets: readonly StudioAsset[];
  consumers: Record<string, ThumbnailStudioAssetConsumerReference[]>;
  selectedImageNode: StudioGraphNode | null;
  onImport: (files: File[]) => void;
  onAddNode: (assetId: string) => void;
  onReplaceSelected: (assetId: string) => void;
  onRename: (assetId: string, label: string) => void;
  onLocate: (nodeId: string) => void;
  onDelete: (assetId: string) => void;
  onRemoveUnused: () => void;
}

const formatAssetByteSize = (byteSize?: number): string => {
  if (!byteSize || !Number.isFinite(byteSize)) return "Size unknown";
  if (byteSize < 1024) return `${byteSize} B`;
  if (byteSize < 1024 * 1024) return `${Math.round(byteSize / 1024)} KiB`;
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MiB`;
};

/** Phase 4 local authoring asset library. 원격 저장 명령은 포함하지 않는다. */
export function ThumbnailAssetPanel({
  assets,
  consumers,
  selectedImageNode,
  onImport,
  onAddNode,
  onReplaceSelected,
  onRename,
  onLocate,
  onDelete,
  onRemoveUnused,
}: ThumbnailAssetPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleAssets = useMemo(
    () =>
      [...assets]
        .reverse()
        .filter((asset) =>
          normalizedQuery
            ? asset.label.toLocaleLowerCase().includes(normalizedQuery)
            : true,
        ),
    [assets, normalizedQuery],
  );

  return (
    <StudioLayerPanelFrame
      summary={`${assets.length} asset${assets.length === 1 ? "" : "s"}`}
      title="Thumbnail Assets"
    >
      <div className="grid gap-2">
        <input
          accept={THUMBNAIL_STUDIO_ASSET_ACCEPT}
          className="hidden"
          multiple
          ref={fileInputRef}
          type="file"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (files.length > 0) onImport(files);
          }}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <button
            className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--sel)] text-[10px] font-bold text-[var(--fg)] hover:bg-[var(--hover)]"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)]"
            type="button"
            onClick={onRemoveUnused}
          >
            Remove unused
          </button>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-[var(--fg3)]" />
          <input
            aria-label="Search thumbnail assets"
            className="h-8 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field)] pl-7 pr-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            placeholder="Search assets"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        {visibleAssets.length === 0 ? (
          <p className="px-1 text-[10px] leading-4 text-[var(--fg3)]">
            Import a PNG, JPEG, or WebP image up to 10 MiB.
          </p>
        ) : null}
        {visibleAssets.map((asset) => {
          const assetConsumers = consumers[asset.id] ?? [];
          const firstNodeConsumer = assetConsumers.find(
            (consumer) => consumer.nodeId,
          );
          const status = getThumbnailStudioAssetStorageStatus(asset);
          return (
            <div
              className="grid grid-cols-[64px_1fr] gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] p-2"
              data-thumbnail-asset-id={asset.id}
              key={asset.id}
            >
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-[var(--field)]">
                {/* Thumbnail Studio는 공용 document src/data URL을 그대로 미리본다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={asset.src}
                />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-[var(--fg)]">
                    {asset.label}
                  </div>
                  <div className="truncate text-[9px] uppercase text-[var(--fg3)]">
                    {asset.mimeType ?? "image"} ·{" "}
                    {formatAssetByteSize(asset.byteSize)} · {status}
                  </div>
                  <div className="text-[9px] text-[var(--fg3)]">
                    {assetConsumers.length} use
                    {assetConsumers.length === 1 ? "" : "s"}
                  </div>
                  {assetConsumers.length > 0 ? (
                    <div
                      className="mt-1 grid gap-0.5 text-[9px] leading-3 text-[var(--fg3)]"
                      data-thumbnail-asset-consumers={asset.id}
                    >
                      {assetConsumers.map((consumer) => (
                        <div key={consumer.id}>
                          {consumer.label} · {consumer.detail}
                          {consumer.locked ? " · locked" : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    className="rounded border border-[var(--field-border)] p-1 text-[var(--fg2)] hover:border-[var(--accent)]"
                    title="Add image node"
                    type="button"
                    onClick={() => onAddNode(asset.id)}
                  >
                    <ImagePlus className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded border border-[var(--field-border)] px-1.5 text-[9px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)] disabled:opacity-40"
                    disabled={!selectedImageNode || selectedImageNode.locked}
                    type="button"
                    onClick={() => onReplaceSelected(asset.id)}
                  >
                    Replace
                  </button>
                  <button
                    className="rounded border border-[var(--field-border)] p-1 text-[var(--fg2)] hover:border-[var(--accent)]"
                    title="Rename asset"
                    type="button"
                    onClick={() => {
                      const label = window.prompt("Asset name", asset.label);
                      if (label?.trim()) onRename(asset.id, label);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded border border-[var(--field-border)] p-1 text-[var(--fg2)] hover:border-[var(--accent)] disabled:opacity-40"
                    disabled={!firstNodeConsumer?.nodeId}
                    title="Locate first use"
                    type="button"
                    onClick={() => {
                      if (firstNodeConsumer?.nodeId) {
                        onLocate(firstNodeConsumer.nodeId);
                      }
                    }}
                  >
                    <LocateFixed className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded border border-[var(--field-border)] p-1 text-red-300 hover:border-red-300"
                    title="Delete asset"
                    type="button"
                    onClick={() => onDelete(asset.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </StudioLayerPanelFrame>
  );
}

export interface ThumbnailTextPresetPanelProps {
  presets: readonly StudioTextEffectPreset[];
  selectedTextNode: StudioGraphNode | null;
  onApply: (preset: StudioTextEffectPreset) => void;
  onCreate: () => void;
  onDuplicate: (presetId: string) => void;
  onRename: (presetId: string, label: string) => void;
  onDelete: (presetId: string) => void;
}

/**
 * 내장/세션 텍스트 preset 목록.
 *
 * 미리보기는 별도 CSS를 복제하지 않고 실제 StudioText를 사용한다. 그래야 preset 카드와
 * 캔버스가 다른 stroke 순서나 shadow 처리를 보여주는 일이 없다.
 */
export function ThumbnailTextPresetPanel({
  presets,
  selectedTextNode,
  onApply,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
}: ThumbnailTextPresetPanelProps) {
  const canEditSelectedText = Boolean(
    selectedTextNode && !selectedTextNode.locked,
  );

  return (
    <StudioLayerPanelFrame
      summary={`${presets.length} presets`}
      title="Text Presets"
    >
      <div className="grid gap-2">
        <button
          className="h-8 rounded-lg border border-[var(--accent)] bg-[var(--sel)] text-[11px] font-semibold text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canEditSelectedText}
          type="button"
          onClick={onCreate}
        >
          Save current text as preset
        </button>
        {!selectedTextNode ? (
          <p className="px-1 text-[10px] leading-4 text-[var(--fg3)]">
            Select one text node to apply or save a preset.
          </p>
        ) : null}
        {presets.map((preset) => (
          <div
            className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)] p-2"
            data-thumbnail-text-preset={preset.id}
            key={`${preset.source}:${preset.id}`}
          >
            <div className="flex items-center justify-between gap-2">
              {preset.source === "custom" ? (
                <input
                  aria-label={`${preset.label} preset name`}
                  className="h-7 min-w-0 flex-1 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-2 text-[11px] font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  value={preset.label}
                  onChange={(event) =>
                    onRename(preset.id, event.currentTarget.value)
                  }
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--fg2)]">
                  {preset.label}
                </span>
              )}
              <span className="text-[9px] uppercase tracking-[0.05em] text-[var(--fg3)]">
                {preset.source} v{preset.version}
              </span>
            </div>
            <div className="flex min-h-14 items-center justify-center overflow-hidden rounded-lg bg-[var(--canvas)] px-2 py-2">
              <StudioText
                appearance={resolveStudioTextAppearance(
                  { textAppearance: preset.appearance },
                  preset.typography,
                )}
                text={preset.previewText}
                typography={preset.typography as React.CSSProperties}
              />
            </div>
            <div className="flex gap-1.5">
              <button
                className="h-7 flex-1 rounded-md border border-[var(--accent)] bg-[var(--sel)] text-[10px] font-semibold text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canEditSelectedText}
                type="button"
                onClick={() => onApply(preset)}
              >
                Apply
              </button>
              {preset.source === "custom" ? (
                <>
                  <button
                    className="h-7 rounded-md border border-[var(--field-border)] px-2 text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)]"
                    type="button"
                    onClick={() => onDuplicate(preset.id)}
                  >
                    Copy
                  </button>
                  <button
                    className="h-7 rounded-md border border-[var(--field-border)] px-2 text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)]"
                    type="button"
                    onClick={() => onDelete(preset.id)}
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </StudioLayerPanelFrame>
  );
}
