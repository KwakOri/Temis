"use client";

import { useEffect, useMemo, useState } from "react";

import type { StudioTemplateDocument } from "@/types/template-studio";
import {
  getStudioEnabledWebFontCss,
  getStudioWebFontSources,
  parseStudioWebFontCss,
} from "@/utils/template-studio/web-fonts";

export type StudioWebFontLoadState = "idle" | "loading" | "loaded" | "error";

interface StudioWebFontLoaderProps {
  document: StudioTemplateDocument;
  onLoadStateChange?: (state: StudioWebFontLoadState) => void;
}

export function StudioWebFontLoader({
  document,
  onLoadStateChange,
}: StudioWebFontLoaderProps) {
  const cssText = useMemo(
    () => getStudioEnabledWebFontCss(document),
    [document],
  );
  const faceChecks = useMemo(
    () =>
      getStudioWebFontSources(document)
        .filter((source) => source.enabled)
        .flatMap((source) => {
          const parsed = parseStudioWebFontCss(source.cssText);
          return parsed.ok
            ? parsed.faces.map((face) => ({
                family: face.family,
                style: face.style,
                weight: face.weight,
              }))
            : [];
        }),
    [document],
  );
  const [loadState, setLoadState] = useState<StudioWebFontLoadState>("idle");

  useEffect(() => {
    let cancelled = false;
    if (!cssText || faceChecks.length === 0 || typeof window === "undefined") {
      setLoadState("idle");
      onLoadStateChange?.("idle");
      return;
    }

    const fonts = window.document.fonts;
    if (!fonts) {
      setLoadState("loaded");
      onLoadStateChange?.("loaded");
      return;
    }

    setLoadState("loading");
    onLoadStateChange?.("loading");
    void Promise.all(
      faceChecks.map((face) =>
        fonts.load(
          `${face.style} ${face.weight} 16px ${JSON.stringify(face.family)}`,
          "Template Studio",
        ),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const nextState = results.every((result) => result.length > 0)
          ? "loaded"
          : "error";
        setLoadState(nextState);
        onLoadStateChange?.(nextState);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
        onLoadStateChange?.("error");
      });

    return () => {
      cancelled = true;
    };
  }, [cssText, faceChecks, onLoadStateChange]);

  if (!cssText) return null;

  return (
    <style data-load-state={loadState} data-template-studio-web-fonts="true">
      {cssText}
    </style>
  );
}
