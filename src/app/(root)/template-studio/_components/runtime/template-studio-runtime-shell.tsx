"use client";

import { CalendarDays } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { StudioRenderer } from "../studio-renderer";
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
  const scale = useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) return 1;

    const availableWidth = Math.max(1, containerSize.width - 48);
    const availableHeight = Math.max(1, containerSize.height - 48);

    return Math.min(
      1,
      availableWidth / Math.max(1, previewSize.width),
      availableHeight / Math.max(1, previewSize.height),
    );
  }, [containerSize.height, containerSize.width, previewSize.height, previewSize.width]);
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

  const resetRuntimeValues = () => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
  };

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
          className="min-h-0 flex-1 overflow-auto bg-slate-950"
          ref={previewContainerRef}
          style={{
            backgroundImage:
              "linear-gradient(45deg, #0b111b 25%, transparent 25%), linear-gradient(-45deg, #0b111b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0b111b 75%), linear-gradient(-45deg, transparent 75%, #0b111b 75%)",
            backgroundPosition: "0 0, 0 16px, 16px -16px, -16px 0",
            backgroundSize: "32px 32px",
          }}
        >
          <div className="flex min-h-full min-w-full items-center justify-center p-6">
            <div
              className="shrink-0 shadow-2xl shadow-black/40"
              style={{
                width: previewSize.width * scale,
                height: previewSize.height * scale,
              }}
            >
              <div
                className="origin-top-left"
                style={{
                  width: previewSize.width,
                  height: previewSize.height,
                  transform: `scale(${scale})`,
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
