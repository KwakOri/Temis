"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

import {
  STUDIO_RUNTIME_MAX_SCALE,
  STUDIO_RUNTIME_MIN_SCALE,
  type StudioRuntimePreviewSize,
  type StudioRuntimeViewport,
} from "./use-studio-runtime-viewport";

interface StudioRuntimePreviewWorkspaceProps {
  backHref: string;
  backLabel: string;
  previewSize: StudioRuntimePreviewSize;
  viewport: StudioRuntimeViewport;
  children: React.ReactNode;
  contentRef?: React.Ref<HTMLDivElement>;
  languageControl?: React.ReactNode;
  scaleLabel?: string;
  resolutionLabel?: string;
  previewAreaTestId?: string;
  controlsTestId?: string;
  scaleInputId?: string;
}

export function StudioRuntimePreviewWorkspace({
  backHref,
  backLabel,
  previewSize,
  viewport,
  children,
  contentRef,
  languageControl,
  scaleLabel = "Preview 배율",
  resolutionLabel = `${previewSize.width} × ${previewSize.height}`,
  previewAreaTestId,
  controlsTestId,
  scaleInputId = "studio-runtime-preview-scale",
}: StudioRuntimePreviewWorkspaceProps) {
  const { viewportTransform } = viewport;

  return (
    <section
      ref={viewport.previewContainerRef}
      className="relative h-full min-h-0 flex-1 overflow-hidden bg-[var(--runtime-form-bg)]"
      data-testid={previewAreaTestId}
    >
      <div
        className="absolute left-4 top-4 z-50 flex max-w-[calc(100%-2rem)] select-none items-center gap-3 rounded-xl border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)]/95 px-3 py-2 shadow-[var(--runtime-shadow-overlay)] backdrop-blur-sm sm:gap-4 sm:px-4"
        data-testid={controlsTestId}
      >
        <Link
          aria-label={backLabel}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--runtime-fg-muted)] transition-colors hover:text-[var(--runtime-fg)] sm:text-sm"
          href={backHref}
        >
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
        <div className="h-6 w-px shrink-0 bg-[var(--runtime-border)]" />
        <div className="flex min-w-0 items-center gap-2">
          <label
            className="shrink-0 text-xs font-bold tabular-nums text-[var(--runtime-fg-muted)]"
            htmlFor={scaleInputId}
          >
            {Math.round(viewportTransform.scale * 100)}%
          </label>
          <input
            aria-label={scaleLabel}
            className="h-2 w-24 accent-[var(--runtime-primary)] sm:w-40 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--runtime-primary)] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--runtime-primary)] [&::-webkit-slider-thumb]:shadow-md"
            id={scaleInputId}
            max={STUDIO_RUNTIME_MAX_SCALE}
            min={STUDIO_RUNTIME_MIN_SCALE}
            step={0.1}
            type="range"
            value={viewportTransform.scale}
            onChange={(event) =>
              viewport.updateScale(Number.parseFloat(event.currentTarget.value))
            }
          />
        </div>
        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--runtime-fg-subtle)]">
          {resolutionLabel}
        </span>
        {languageControl}
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onDoubleClick={viewport.fitToViewport}
        onPointerCancel={viewport.stopPanning}
        onPointerDown={viewport.handlePointerDown}
        onPointerMove={viewport.handlePointerMove}
        onPointerUp={viewport.stopPanning}
        onWheel={viewport.handleViewportWheel}
      >
        <div
          className="relative shrink-0 rounded-sm shadow-[var(--runtime-shadow-overlay)]"
          style={{
            width: previewSize.width * viewportTransform.scale,
            height: previewSize.height * viewportTransform.scale,
            cursor: viewport.isPanning ? "grabbing" : "grab",
            transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px)`,
          }}
        >
          <div
            className="origin-top-left"
            style={{
              width: previewSize.width,
              height: previewSize.height,
              transform: `scale(${viewportTransform.scale})`,
            }}
          >
            <div
              ref={contentRef}
              className="relative"
              data-testid="studio-runtime-preview-content"
              style={{ height: previewSize.height, width: previewSize.width }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
