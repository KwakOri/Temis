"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from "react";
import {
  dropThumbnailAddonImage,
  type ThumbnailAddonImage,
} from "@/utils/thumbnail-studio/user-images";

interface DropTarget {
  id: string;
  position: "before" | "after";
  top: number;
}

const getScrollContainer = (element: HTMLElement) => {
  let parent = element.parentElement;
  while (parent) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
};

export function useThumbnailAddonReorder(
  listRef: RefObject<HTMLDivElement | null>,
  setImages: Dispatch<SetStateAction<ThumbnailAddonImage[]>>,
) {
  const cleanupRef = useRef<(() => void) | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const startReorder = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const list = listRef.current;
    const handle = event.currentTarget;
    const card = handle.closest<HTMLElement>("[data-thumbnail-addon]");
    if (!list || !card) return;
    event.preventDefault();
    cleanupRef.current?.();
    const pointerId = event.pointerId;
    const origin = { x: event.clientX, y: event.clientY };
    let point = { ...origin };
    const bounds = card.getBoundingClientRect();
    const scrollContainer = getScrollContainer(list);
    let preview: HTMLElement | null = null;
    let indicator: HTMLElement | null = null;
    let target: DropTarget | null = null;
    let frame = 0;
    let lastTime = 0;
    const previousCursor = window.document.body.style.cursor;
    const previousSelection = window.document.body.style.userSelect;

    const render = () => {
      if (!preview || !indicator) return;
      preview.style.transform = `translate3d(${point.x - origin.x}px, ${point.y - origin.y}px, 0)`;
      const rect = list.getBoundingClientRect();
      const viewport = scrollContainer?.getBoundingClientRect();
      const top = Math.max(0, viewport?.top ?? 0);
      const bottom = Math.min(
        window.innerHeight,
        viewport?.bottom ?? window.innerHeight,
      );
      target = null;
      // Dropping in another section, including the fixed background, does not reorder anything.
      if (
        point.x >= rect.left - 8 &&
        point.x <= rect.right + 8 &&
        point.y >= Math.max(top, rect.top - 8) &&
        point.y <= Math.min(bottom, rect.bottom + 8)
      ) {
        const rows = Array.from(
          list.querySelectorAll<HTMLElement>("[data-thumbnail-addon]"),
        ).filter((row) => row.dataset.thumbnailAddon !== id);
        const next = rows.find((row) => {
          const bounds = row.getBoundingClientRect();
          return point.y < bounds.top + bounds.height / 2;
        });
        const row = next ?? rows[rows.length - 1];
        if (row) {
          const bounds = row.getBoundingClientRect();
          target = {
            id: row.dataset.thumbnailAddon!,
            position: next ? "before" : "after",
            top: next ? bounds.top - 4 : bounds.bottom + 4,
          };
        }
      }
      if (target) {
        indicator.hidden = false;
        indicator.style.left = `${rect.left}px`;
        indicator.style.top = `${Math.max(top, Math.min(bottom - 3, target.top - 1.5))}px`;
        indicator.style.width = `${rect.width}px`;
      } else indicator.hidden = true;
    };

    const tick = (time: number) => {
      if (scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const top = Math.max(0, rect.top);
        const bottom = Math.min(window.innerHeight, rect.bottom);
        const edge = Math.min(48, (bottom - top) / 4);
        if (edge > 0 && point.x >= rect.left && point.x <= rect.right) {
          const speed =
            point.y < top + edge
              ? -Math.min(1, (top + edge - point.y) / edge)
              : point.y > bottom - edge
                ? Math.min(1, (point.y - bottom + edge) / edge)
                : 0;
          const elapsed = lastTime ? Math.min(time - lastTime, 32) : 16;
          scrollContainer.scrollTop += (speed * 14 * elapsed) / 16;
        }
      }
      lastTime = time;
      render();
      frame = requestAnimationFrame(tick);
    };

    const activate = () => {
      // A noninteractive snapshot preserves the complete card, including its current adjustment state.
      preview = card.cloneNode(true) as HTMLElement;
      preview.removeAttribute("data-thumbnail-addon");
      preview.dataset.thumbnailAddonDragPreview = id;
      preview.setAttribute("aria-hidden", "true");
      preview.inert = true;
      preview.classList.add("studio-runtime-theme");
      preview
        .querySelectorAll("[id]")
        .forEach((element) => element.removeAttribute("id"));
      const computed = getComputedStyle(card);
      Object.assign(preview.style, {
        position: "fixed",
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        margin: "0",
        pointerEvents: "none",
        zIndex: "10000",
        opacity: "0.85",
        transition: "none",
        background: "var(--runtime-card-bg)",
        borderColor: "var(--runtime-primary)",
        boxShadow: "var(--runtime-shadow-overlay)",
        willChange: "transform",
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        color: computed.color,
      });
      indicator = window.document.createElement("div");
      indicator.dataset.thumbnailAddonDropIndicator = "true";
      indicator.setAttribute("aria-hidden", "true");
      indicator.className = "studio-runtime-theme";
      Object.assign(indicator.style, {
        position: "fixed",
        height: "3px",
        borderRadius: "999px",
        pointerEvents: "none",
        zIndex: "10001",
        background: "var(--runtime-primary)",
      });
      window.document.body.append(preview, indicator);
      window.document.body.style.cursor = "grabbing";
      window.document.body.style.userSelect = "none";
      setDraggingId(id);
      render();
      frame = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancelPointer);
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", cancel);
      handle.removeEventListener("lostpointercapture", cancel);
      if (handle.hasPointerCapture(pointerId))
        handle.releasePointerCapture(pointerId);
      preview?.remove();
      indicator?.remove();
      if (preview) {
        window.document.body.style.cursor = previousCursor;
        window.document.body.style.userSelect = previousSelection;
      }
      cleanupRef.current = null;
      setDraggingId(null);
    };
    const cancel = () => cleanup();
    const cancelPointer = (pointer: PointerEvent) => {
      if (pointer.pointerId === pointerId) cancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancel();
        handle.focus({ preventScroll: true });
      }
    };
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      point = { x: pointer.clientX, y: pointer.clientY };
      if (!preview && Math.hypot(point.x - origin.x, point.y - origin.y) >= 5)
        activate();
    };
    const finish = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      point = { x: pointer.clientX, y: pointer.clientY };
      render();
      if (preview && target) {
        const drop = target;
        setImages((current) =>
          dropThumbnailAddonImage(current, id, drop.id, drop.position),
        );
      }
      cleanup();
      handle.focus({ preventScroll: true });
    };
    cleanupRef.current = cleanup;
    handle.setPointerCapture(pointerId);
    handle.addEventListener("lostpointercapture", cancel);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancelPointer);
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", cancel);
  };
  return { draggingId, startReorder };
}
