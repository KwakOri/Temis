"use client";

import React, { forwardRef } from "react";

import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import type { StudioWebFontLoadState } from "@/components/studio/canvas/studio-web-font-loader";

interface StudioExportRootProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  runtimeImageOverrides?: Record<
    string,
    { fit?: "cover" | "contain" | "fill"; objectPosition?: string }
  >;
  onFontLoadStateChange?: (state: StudioWebFontLoadState) => void;
}

export const StudioExportRoot = forwardRef<
  HTMLDivElement,
  StudioExportRootProps
>(function StudioExportRoot(
  { document, runtimeValues, runtimeImageOverrides, onFontLoadStateChange },
  ref,
) {
  const transparentBackground =
    document.domains?.thumbnail?.export.transparentBackground === true;

  return (
    <div
      ref={ref}
      className="relative shrink-0 overflow-hidden"
      data-studio-export-root="true"
      style={{
        height: document.canvas.height,
        width: document.canvas.width,
      }}
    >
      <StudioRenderer
        backgroundOverride={transparentBackground ? null : undefined}
        document={document}
        onFontLoadStateChange={onFontLoadStateChange}
        runtimeImageOverrides={runtimeImageOverrides}
        runtimeValues={runtimeValues}
      />
    </div>
  );
});
