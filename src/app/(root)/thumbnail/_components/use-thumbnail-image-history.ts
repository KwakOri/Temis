"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createThumbnailImagePlacementHistory } from "@/utils/thumbnail-studio/image-placement-history";
import type { StudioRuntimeImageOverrides } from "@/utils/thumbnail-studio/runtime-image-transform";
import { resolveStudioShortcut } from "@/utils/template-studio/keyboard-shortcuts";

export function useThumbnailImageHistory(
  initialize: () => StudioRuntimeImageOverrides,
) {
  const [overrides, setState] = useState(initialize);
  const current = useRef(overrides);
  const [history] = useState(createThumbnailImagePlacementHistory);
  // Keep the current value synchronous: pointerup may follow the last move before
  // React renders, and must commit the final geometry rather than a stale render.
  const setOverrides = useCallback<
    Dispatch<SetStateAction<StudioRuntimeImageOverrides>>
  >((action) => {
    const next =
      typeof action === "function" ? action(current.current) : action;
    current.current = next;
    setState(next);
  }, []);
  const changePlacement = useCallback(
    (
      action: (
        value: StudioRuntimeImageOverrides,
      ) => StudioRuntimeImageOverrides,
    ) => {
      const next = action(current.current);
      history.recordChange(current.current, next);
      setOverrides(next);
    },
    [history, setOverrides],
  );
  const begin = useCallback(() => history.begin(current.current), [history]);
  const finish = useCallback(() => history.finish(current.current), [history]);
  const cancel = useCallback(() => {
    const restored = history.cancel(current.current);
    if (restored) setOverrides(restored);
  }, [history, setOverrides]);
  const clear = useCallback(() => history.clear(), [history]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey) return;
      // This screen uses only Z shortcuts, not the full editor's command set.
      if (event.key.toLowerCase() !== "z") return;
      const target = event.target;
      const isEditingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          Boolean(target.closest("input, textarea, select")));
      const shortcut = resolveStudioShortcut(event, {
        isEditingTarget,
        hasCutNodes: false,
        isNodePickerOpen: false,
      });
      if (shortcut?.action !== "undo" && shortcut?.action !== "redo") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat || history.isTransforming) return;
      const restored = history[shortcut.action](current.current);
      if (restored) setOverrides(restored);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history, setOverrides]);

  return {
    overrides,
    setOverrides,
    changePlacement,
    begin,
    finish,
    cancel,
    clear,
  };
}
