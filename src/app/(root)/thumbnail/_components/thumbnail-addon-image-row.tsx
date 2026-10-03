"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, MoreVertical, RotateCcw, Trash2 } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const isAdjusting = activeImage?.inputId === image.id;
  useEffect(() => {
    if (editingName) {
      nameInput.current?.focus();
      nameInput.current?.select();
    }
  }, [editingName]);
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);
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
        "grid gap-2 rounded-xl border border-[var(--runtime-border)] p-2",
        dragging && "border-[var(--runtime-primary)] opacity-70",
      )}
      data-thumbnail-addon={image.id}
    >
      <div className="flex min-w-0 items-center gap-2" data-thumbnail-addon-row>
        <StudioRuntimeActionButton
          variant="ghost"
          size="icon"
          className="w-5 shrink-0 touch-none cursor-grab active:cursor-grabbing"
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
        <div
          ref={menuRef}
          className="relative shrink-0"
          onBlur={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setMenuOpen(false);
          }}
        >
          <button
            ref={menuButton}
            type="button"
            aria-label={`${name} 레이어 메뉴`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-[var(--runtime-input-hover)] focus-visible:outline-2 focus-visible:outline-[var(--runtime-primary)]"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              aria-label={`${name} 레이어 작업`}
              className="absolute right-0 top-full z-20 mt-1 grid w-36 gap-1 rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] p-1 shadow-lg"
              onKeyDown={(event) => {
                if (
                  event.key !== "ArrowDown" &&
                  event.key !== "ArrowUp" &&
                  event.key !== "Home" &&
                  event.key !== "End"
                )
                  return;
                event.preventDefault();
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="menuitem"]',
                  ),
                );
                const index = items.indexOf(
                  window.document.activeElement as HTMLButtonElement,
                );
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : (index +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          items.length) %
                        items.length;
                items[next]?.focus();
              }}
            >
              <button
                type="button"
                role="menuitem"
                className="flex items-center gap-2 rounded px-2 py-2 text-xs hover:bg-[var(--runtime-input-hover)] focus:bg-[var(--runtime-input-hover)]"
                onClick={() => {
                  onReset();
                  setMenuOpen(false);
                  menuButton.current?.focus();
                }}
              >
                <RotateCcw size={14} />
                재설정
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex items-center gap-2 rounded px-2 py-2 text-xs text-[var(--runtime-danger)] hover:bg-[var(--runtime-input-hover)] focus:bg-[var(--runtime-input-hover)]"
                onClick={onRemove}
              >
                <Trash2 size={14} />
                삭제
              </button>
            </div>
          ) : null}
        </div>
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
  );
}
