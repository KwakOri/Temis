"use client";
import { CheckCircle2, Plus, Type } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";
import { StudioNodeTypeIcon } from "@/components/studio/node-type-icon";
import { cn } from "@/lib/utils";
import type { StudioGraphNodeType } from "@/types/template-studio";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import {
  isStudioCardContextObjectPreset,
  isStudioCardSelectInputBundlePreset,
  isStudioCardStatusBackgroundPreset,
  isStudioTimetableCompositionPreset,
  type StudioCardContextObjectPreset,
  type StudioCardSelectInputBundlePreset,
  type StudioCardStatusBackgroundPreset,
  type StudioPresetGroup,
  type StudioPresetListItem,
  type StudioTimetableCompositionPreset,
} from "@/utils/template-studio/preset-registry";

/**
 * 프리셋 하나가 어떤 상태인지 알려줄 말.
 *
 * 넣을 수 없는 이유가 있으면 그것을 먼저 보여준다. 이유를 감추고 그냥 흐리게만
 * 두면 왜 눌리지 않는지 알 수 없다. 이미 있는 프리셋은 또 넣는 것이 아니라
 * 그것을 고르는 동작이므로 그렇게 알려준다.
 */
export const getStudioPresetStatusLabel = ({
  definition,
  disabledReason,
  existingTargetId,
}: StudioPresetListItem): string =>
  disabledReason ?? (existingTargetId ? "Added" : definition.typeLabel);

/** 프리셋 목록에 있는 프리셋 수. 묶음별로 나눠 두었으므로 합쳐서 센다. */
const countPresets = (groups: StudioPresetGroup[]): number =>
  groups.reduce((count, group) => count + group.presets.length, 0);

export interface StudioTimetablePresetsPanelProps {
  groups: StudioPresetGroup[];
  onInsertPreset: (definition: StudioTimetableCompositionPreset) => void;
}

/**
 * 시간표 프리셋 목록.
 *
 * 계획만 세워 둔 프리셋도 목록에 함께 둔다. 무엇이 앞으로 생기는지 보여주되
 * 누를 수는 없게 한다. 그래서 넣을 수 있는지는 종류로도 한 번 더 본다.
 */
export function StudioTimetablePresetsPanel({
  groups,
  onInsertPreset,
}: StudioTimetablePresetsPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          Timetable Presets
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--fg3)]">
          {countPresets(groups)} presets
        </div>
      </div>
      <div className="template-studio-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {groups.length === 0 ? (
          <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-3 text-xs font-semibold text-[var(--fg3)]">
            No presets yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <section className="grid gap-1.5" key={group.title}>
                <div className="px-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
                  {group.title}
                </div>
                {group.presets.map((item) => {
                  const { definition, disabledReason, existingTargetId } = item;
                  const canInsert =
                    isStudioTimetableCompositionPreset(definition) &&
                    !disabledReason;

                  return (
                    <button
                      className={cn(
                        "flex min-h-12 w-full items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-left transition",
                        canInsert
                          ? "hover:border-[var(--accent)] hover:bg-[var(--hover)]"
                          : "cursor-not-allowed opacity-55",
                      )}
                      disabled={!canInsert}
                      key={definition.id}
                      title={definition.description ?? definition.label}
                      type="button"
                      onClick={() => {
                        if (!isStudioTimetableCompositionPreset(definition)) {
                          return;
                        }
                        onInsertPreset(definition);
                      }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--sel)] text-[var(--accent)]">
                        <Type size={15} />
                      </span>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="truncate text-[12px] font-bold text-[var(--fg)]">
                          {definition.label}
                        </span>
                        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
                          {getStudioPresetStatusLabel(item)}
                        </span>
                      </span>
                      {existingTargetId ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--fg2)]" />
                      )}
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 카드 편집에서 곧바로 놓을 수 있는 객체 종류. */
/**
 * 카드에 곧바로 놓을 수 있는 종류.
 *
 * 카드 한 장 안에는 도형을 두지 않는다. 카드 배경은 상태별 그림 자리를 가진
 * 전용 프리셋이 담당하므로, 여기에 도형을 더하면 같은 일을 하는 두 가지 방법이
 * 생긴다. 아이콘과 이름은 노드 정의표에서 온다.
 */
const STUDIO_CARD_NODE_TYPES = [
  "group",
  "text",
  "flexibleText",
  "image",
] as const satisfies readonly StudioGraphNodeType[];

export interface StudioCardsPresetsPanelProps {
  groups: StudioPresetGroup[];
  onAddNode: (type: (typeof STUDIO_CARD_NODE_TYPES)[number]) => void;
  onAddContextObject: (definition: StudioCardContextObjectPreset) => void;
  onAddStatusBackground: (definition: StudioCardStatusBackgroundPreset) => void;
  onAddSelectInputBundle: (
    definition: StudioCardSelectInputBundlePreset,
  ) => void;
}

/**
 * 카드 프리셋 목록.
 *
 * 위쪽은 빈 객체를 곧바로 놓는 자리이고 아래쪽은 미리 만들어 둔 묶음이다.
 * 프리셋은 종류마다 넣는 방법이 다르므로 종류를 보고 갈라 부른다. 어느 종류에도
 * 해당하지 않는 프리셋은 계획만 세워 둔 것이라 누를 수 없다.
 */
export function StudioCardsPresetsPanel({
  groups,
  onAddNode,
  onAddContextObject,
  onAddStatusBackground,
  onAddSelectInputBundle,
}: StudioCardsPresetsPanelProps) {
  return (
    <div className="template-studio-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          Cards Presets
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--fg3)]">
          Add objects and reusable bundles
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 px-3 py-3">
        {STUDIO_CARD_NODE_TYPES.map((type) => (
          <button
            className="flex h-10 items-center justify-center rounded-[9px] border border-[var(--field-border)] bg-[var(--field)] text-xs font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            key={type}
            title={`Add ${getStudioGraphNodeTypeLabel(type)}`}
            type="button"
            onClick={() => onAddNode(type)}
          >
            <StudioNodeTypeIcon size={17} type={type} />
          </button>
        ))}
      </div>
      <div className="grid gap-3 border-t border-[var(--border)] px-3 py-3">
        {groups.length === 0 ? (
          <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-xs font-semibold text-[var(--fg3)]">
            No card presets yet.
          </div>
        ) : (
          groups.map((group) => (
            <section className="grid gap-1.5" key={group.title}>
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
                {group.title}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {group.presets.map(
                  ({ definition, disabledReason, existingTargetId }) => {
                    const canInsert =
                      (isStudioCardContextObjectPreset(definition) ||
                        isStudioCardStatusBackgroundPreset(definition) ||
                        isStudioCardSelectInputBundlePreset(definition)) &&
                      !disabledReason;

                    return (
                      <button
                        className={cn(
                          "flex h-9 min-w-0 items-center justify-center gap-1 rounded-[8px] border border-[var(--field-border)] bg-[var(--field)] px-2 text-[11px] font-bold text-[var(--fg2)] transition",
                          canInsert
                            ? "hover:border-[var(--accent)] hover:text-[var(--fg)]"
                            : "cursor-not-allowed opacity-55",
                        )}
                        disabled={!canInsert}
                        key={definition.id}
                        title={
                          disabledReason ??
                          (existingTargetId
                            ? `Select existing ${definition.label}`
                            : `Add ${definition.label}`)
                        }
                        type="button"
                        onClick={() => {
                          if (isStudioCardContextObjectPreset(definition)) {
                            onAddContextObject(definition);
                            return;
                          }

                          if (isStudioCardStatusBackgroundPreset(definition)) {
                            onAddStatusBackground(definition);
                            return;
                          }

                          if (isStudioCardSelectInputBundlePreset(definition)) {
                            onAddSelectInputBundle(definition);
                          }
                        }}
                      >
                        <span className="truncate">{definition.label}</span>
                        {existingTargetId ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-300" />
                        ) : null}
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
