"use client";

import { CalendarDays, Maximize2, Minus, Plus } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { StudioRenderer } from "../studio-renderer";
import { clampStudioPreviewScale } from "../studio-canvas-viewport";
import {
  getStudioTimetablePreviewSize,
  StudioTimetablePreview,
} from "../studio-timetable-preview";
import { TemplateStudioRuntimeForm } from "./template-studio-runtime-form";

interface TemplateStudioRuntimeShellProps {
  document: StudioTemplateDocument;
  initialRuntimeValues: StudioRuntimeValues;
  source: "draft" | "published";
  templateId?: string | null;
  templateName?: string;
  updatedAt?: string | null;
}

const cloneRuntimeValues = (
  runtimeValues: StudioRuntimeValues,
): StudioRuntimeValues =>
  JSON.parse(JSON.stringify(runtimeValues)) as StudioRuntimeValues;

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const zoomStep = 0.1;

export function TemplateStudioRuntimeShell({
  document,
  initialRuntimeValues,
  source,
  templateId,
  templateName,
  updatedAt,
}: TemplateStudioRuntimeShellProps) {
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [runtimeValues, setRuntimeValues] = useState<StudioRuntimeValues>(() =>
    cloneRuntimeValues(initialRuntimeValues),
  );
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });
  const [viewportTransform, setViewportTransform] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const timetable = document.domains?.timetable;
  const previewSize = useMemo(
    () =>
      timetable
        ? getStudioTimetablePreviewSize(timetable)
        : {
            width: document.canvas.width,
            height: document.canvas.height,
          },
    [document.canvas.height, document.canvas.width, timetable],
  );
  const fitToViewport = useCallback(() => {
    const element = previewContainerRef.current;
    if (!element) return;

    const availableWidth = Math.max(1, element.clientWidth - 48);
    const availableHeight = Math.max(1, element.clientHeight - 48);
    const fitScale = clampStudioPreviewScale(
      Math.min(
        1,
        availableWidth / Math.max(1, previewSize.width),
        availableHeight / Math.max(1, previewSize.height),
      ),
    );

    setViewportTransform({
      scale: Number(fitScale.toFixed(2)),
      x: 0,
      y: 0,
    });
  }, [previewSize.height, previewSize.width]);

  const updateScale = useCallback(
    (
      nextScale: number,
      anchor?: {
        clientX: number;
        clientY: number;
      },
    ) => {
      const element = previewContainerRef.current;
      const clampedScale = Number(
        clampStudioPreviewScale(nextScale).toFixed(2),
      );

      setViewportTransform((currentTransform) => {
        if (!element || !anchor || currentTransform.scale === clampedScale) {
          return {
            ...currentTransform,
            scale: clampedScale,
          };
        }

        const rect = element.getBoundingClientRect();
        const pointerX = anchor.clientX - rect.left;
        const pointerY = anchor.clientY - rect.top;
        const currentWidth = previewSize.width * currentTransform.scale;
        const currentHeight = previewSize.height * currentTransform.scale;
        const currentLeft =
          rect.width / 2 + currentTransform.x - currentWidth / 2;
        const currentTop =
          rect.height / 2 + currentTransform.y - currentHeight / 2;
        const localX =
          (pointerX - currentLeft) / Math.max(0.001, currentTransform.scale);
        const localY =
          (pointerY - currentTop) / Math.max(0.001, currentTransform.scale);
        const nextWidth = previewSize.width * clampedScale;
        const nextHeight = previewSize.height * clampedScale;

        return {
          scale: clampedScale,
          x: pointerX - rect.width / 2 + nextWidth / 2 - localX * clampedScale,
          y:
            pointerY -
            rect.height / 2 +
            nextHeight / 2 -
            localY * clampedScale,
        };
      });
    },
    [previewSize.height, previewSize.width],
  );

  const displayName =
    templateName?.trim() || document.metadata.name || "Template Studio Preview";
  const updatedAtLabel = formatUpdatedAt(updatedAt);

  useEffect(() => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
  }, [initialRuntimeValues]);

  useEffect(() => {
    const element = previewContainerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) return;

    const animationFrame = window.requestAnimationFrame(fitToViewport);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [containerSize.height, containerSize.width, fitToViewport]);

  const resetRuntimeValues = () => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
  };

  const handleViewportWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      const direction = event.deltaY > 0 ? -1 : 1;
      const multiplier = event.shiftKey ? 2 : 1;
      updateScale(
        viewportTransform.scale + direction * zoomStep * multiplier,
        {
          clientX: event.clientX,
          clientY: event.clientY,
        },
      );
    },
    [updateScale, viewportTransform.scale],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      panStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: viewportTransform.x,
        originY: viewportTransform.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsPanning(true);
    },
    [viewportTransform.x, viewportTransform.y],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const panState = panStateRef.current;
      if (!panState || panState.pointerId !== event.pointerId) return;

      setViewportTransform((currentTransform) => ({
        ...currentTransform,
        x: panState.originX + event.clientX - panState.startX,
        y: panState.originY + event.clientY - panState.startY,
      }));
    },
    [],
  );

  const stopPanning = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null;
      setIsPanning(false);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500 text-white">
          <CalendarDays size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-bold">{displayName}</h1>
            <span className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-slate-400">
              {source}
            </span>
          </div>
          <div className="flex min-w-0 gap-2 text-[11px] font-semibold text-slate-500">
            {templateId ? <span className="truncate">{templateId}</span> : null}
            {updatedAtLabel ? <span>{updatedAtLabel}</span> : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          className="relative min-h-0 flex-1 overflow-hidden bg-slate-950"
          ref={previewContainerRef}
        >
          <div className="absolute right-4 top-4 z-20 flex h-9 items-center rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-lg shadow-black/30 backdrop-blur">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Zoom out"
              type="button"
              onClick={() => updateScale(viewportTransform.scale - zoomStep)}
            >
              <Minus size={14} />
            </button>
            <span className="min-w-12 text-center text-xs font-bold text-slate-200">
              {Math.round(viewportTransform.scale * 100)}%
            </span>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Zoom in"
              type="button"
              onClick={() => updateScale(viewportTransform.scale + zoomStep)}
            >
              <Plus size={14} />
            </button>
            <div className="mx-1 h-5 w-px bg-slate-700" />
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Fit"
              type="button"
              onClick={fitToViewport}
            >
              <Maximize2 size={14} />
            </button>
          </div>

          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #0b111b 25%, transparent 25%), linear-gradient(-45deg, #0b111b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0b111b 75%), linear-gradient(-45deg, transparent 75%, #0b111b 75%)",
              backgroundPosition: "0 0, 0 16px, 16px -16px, -16px 0",
              backgroundSize: "32px 32px",
              touchAction: "none",
            }}
            onDoubleClick={fitToViewport}
            onPointerCancel={stopPanning}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPanning}
            onWheel={handleViewportWheel}
          >
            <div
              className="relative shrink-0 shadow-2xl shadow-black/40"
              style={{
                width: previewSize.width * viewportTransform.scale,
                height: previewSize.height * viewportTransform.scale,
                cursor: isPanning ? "grabbing" : "grab",
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
                {timetable ? (
                  <StudioTimetablePreview
                    document={document}
                    runtimeValues={runtimeValues}
                  />
                ) : (
                  <StudioRenderer
                    document={document}
                    runtimeValues={runtimeValues}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="h-[44vh] min-h-[320px] shrink-0 lg:h-full">
          <TemplateStudioRuntimeForm
            document={document}
            runtimeValues={runtimeValues}
            setRuntimeValues={setRuntimeValues}
            onReset={resetRuntimeValues}
          />
        </div>
      </div>
    </main>
  );
}
