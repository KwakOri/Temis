"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { ThumbnailImageActionsMenu } from "./thumbnail-image-actions-menu";
import { StudioRuntimeActionButton } from "@/components/studio/runtime/ui/studio-runtime-action-button";
import { cn } from "@/lib/utils";
import type { ThumbnailAddonImage } from "@/utils/thumbnail-studio/user-images";
import type { getThumbnailRuntimeImageNodes } from "@/utils/thumbnail-studio/runtime-image-transform";

type ImageTarget = { inputId: string; nodeId: string };
interface Props {
  image: ThumbnailAddonImage;
  name: string;
  imageNodes: ReturnType<typeof getThumbnailRuntimeImageNodes>;
  activeImage?: ImageTarget | null;
  dragging: boolean;
  onRename: (name: string) => void;
  onReorderStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onMove: (delta: -1 | 1) => void;
  onAdjustImage?: (target: ImageTarget | null) => void;
  onReset: () => void;
  onRemove: () => void;
}

export function ThumbnailAddonImageRow({
  image,
  name,
  imageNodes,
  activeImage,
  dragging,
  onRename,
  onReorderStart,
  onMove,
  onAdjustImage,
  onReset,
  onRemove,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const cancelled = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const nameButton = useRef<HTMLButtonElement>(null);
  const isAdjusting = activeImage?.inputId === image.id;
  useEffect(() => {
    if (editingName) {
      nameInput.current?.focus();
      nameInput.current?.select();
    }
  }, [editingName]);
  const beginRename = () => {
    cancelled.current = false;
    setDraftName(name);
    setEditingName(true);
  };
  const finishRename = () => {
    const next = draftName.trim();
    if (!cancelled.current && next) onRename(next);
    setEditingName(false);
  };
  return (
    <div
      className={cn(
        "grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-[var(--runtime-border)] p-2",
        dragging && "border-dashed border-[var(--runtime-primary)] opacity-25",
      )}
      data-thumbnail-addon={image.id}
    >
      <StudioRuntimeActionButton
        variant="ghost"
        size="icon"
        className="h-auto w-5 self-stretch touch-none cursor-grab active:cursor-grabbing"
        aria-label={`${name} 레이어 순서 변경`}
        title="드래그로 순서 변경 · 위/아래 방향키로 이동"
        onPointerDown={onReorderStart}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onMove(event.key === "ArrowUp" ? 1 : -1);
          }
        }}
      >
        <MoreVertical size={16} aria-hidden="true" />
      </StudioRuntimeActionButton>
      <div className="grid min-w-0 gap-2">
        <div
          className="flex min-w-0 items-center gap-2"
          data-thumbnail-addon-row
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Browser-local image preview. */}
          <img
            src={image.src}
            alt={name}
            draggable={false}
            className="size-10 shrink-0 rounded-lg bg-[var(--runtime-input-bg)] object-contain"
          />
          {editingName ? (
            <input
              ref={nameInput}
              aria-label={`${name} 레이어 이름`}
              value={draftName}
              maxLength={100}
              className="h-8 min-w-0 flex-1 rounded border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] px-2 text-xs font-bold outline-none focus:border-[var(--runtime-primary)]"
              onChange={(event) => setDraftName(event.currentTarget.value)}
              onBlur={finishRename}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.blur();
                  requestAnimationFrame(() => nameButton.current?.focus());
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelled.current = true;
                  event.currentTarget.blur();
                  requestAnimationFrame(() => nameButton.current?.focus());
                }
              }}
            />
          ) : (
            <button
              ref={nameButton}
              type="button"
              className="min-w-0 flex-1 truncate rounded text-left text-xs font-bold focus-visible:outline-2 focus-visible:outline-[var(--runtime-primary)]"
              title="더블클릭으로 이름 변경"
              aria-label={`${name} 레이어 이름 변경`}
              onDoubleClick={beginRename}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "F2") {
                  event.preventDefault();
                  beginRename();
                }
              }}
            >
              {name}
            </button>
          )}
          <ThumbnailImageActionsMenu
            name={name}
            onReset={onReset}
            onRemove={onRemove}
          />
        </div>
        <StudioRuntimeActionButton
          fullWidth
          variant={isAdjusting ? "primary" : "secondary"}
          aria-label={
            isAdjusting ? "애드온 이미지 변경 완료" : "애드온 이미지 위치 조정"
          }
          disabled={!imageNodes.length || !onAdjustImage}
          onClick={() =>
            onAdjustImage?.(
              isAdjusting
                ? null
                : {
                    inputId: image.id,
                    nodeId: `${imageNodes[0].id}:${image.id}`,
                  },
            )
          }
        >
          {isAdjusting ? "변경 완료" : "위치 조정"}
        </StudioRuntimeActionButton>
        {isAdjusting && imageNodes.length > 1 ? (
          <select
            aria-label="애드온 이미지 조정할 레이어"
            value={activeImage.nodeId}
            className="rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] p-2 text-xs"
            onChange={(event) =>
              onAdjustImage?.({
                inputId: image.id,
                nodeId: event.currentTarget.value,
              })
            }
          >
            {imageNodes.map((node) => (
              <option key={node.id} value={`${node.id}:${image.id}`}>
                {node.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
