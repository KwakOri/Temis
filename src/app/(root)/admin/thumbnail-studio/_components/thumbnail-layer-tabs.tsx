"use client";

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Eye,
  EyeOff,
  Group,
  Lock,
  Trash2,
  Ungroup,
  Unlock,
} from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

import { StudioLayerPanelFrame } from "@/components/studio/layers/studio-layer-primitives";
import { StudioNodeTypeIcon } from "@/components/studio/node-type-icon";
import type { StudioGraphNodeType } from "@/types/template-studio";
import {
  getStudioNodeDefinitions,
  type StudioNodeDefinition,
} from "@/utils/template-studio/node-definitions";

export interface ThumbnailAddMenuProps {
  onAddNode: (type: StudioGraphNodeType) => void;
}

/**
 * 노드 추가 메뉴.
 *
 * 목록과 순서, 이름, 아이콘을 모두 노드 정의표에서 만든다. 화면에 문자열 배열을 따로
 * 적으면 정의표에 종류를 더해도 메뉴에 나타나지 않고, 그 사실을 아무것도 알려주지 않는다.
 *
 * 탭 위에 둔다. 어느 탭을 보고 있어도 객체를 넣을 수 있어야 한다.
 */
export function ThumbnailAddMenu({ onAddNode }: ThumbnailAddMenuProps) {
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
