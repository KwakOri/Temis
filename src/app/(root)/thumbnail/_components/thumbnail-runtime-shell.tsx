"use client";

import { ChevronLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
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
import { StudioExportRoot } from "@/components/studio/runtime/studio-export-root";
import type { StudioWebFontLoadState } from "@/components/studio/canvas/studio-web-font-loader";
import {
  exportStudioPng,
  buildStudioExportFileName,
} from "@/utils/template-studio/png-export";
import { ThumbnailRuntimeForm } from "./thumbnail-runtime-form";

interface ThumbnailRuntimeShellProps {
  document: StudioTemplateDocument;
  initialRuntimeValues: StudioRuntimeValues;
  templateId: string;
  storageOwnerId: string;
  templateName: string;
  revisionNo: number;
  backHref?: string;
}

interface RenderReadiness {
  fontsReady: boolean;
  imagesReady: boolean;
  layoutReady: boolean;
  blockingErrors: string[];
}

const cloneRuntimeValues = (values: StudioRuntimeValues): StudioRuntimeValues =>
  JSON.parse(JSON.stringify(values)) as StudioRuntimeValues;

export function ThumbnailRuntimeShell({
  document,
  initialRuntimeValues,
  templateId,
  storageOwnerId,
  templateName,
  revisionNo,
  backHref = "/my-page",
}: ThumbnailRuntimeShellProps) {
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const exportRootRef = useRef<HTMLDivElement | null>(null);
  const [runtimeValues, setRuntimeValues] = useState(() =>
    cloneRuntimeValues(initialRuntimeValues),
  );
  const [runtimeImageOverrides, setRuntimeImageOverrides] = useState<
    Record<
      string,
      { fit?: "cover" | "contain" | "fill"; objectPosition?: string }
    >
  >({});
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [readiness, setReadiness] = useState<RenderReadiness>({
    fontsReady: false,
    imagesReady: false,
    layoutReady: false,
    blockingErrors: [],
  });

  useEffect(() => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
    setRuntimeImageOverrides({});
  }, [document, initialRuntimeValues, revisionNo]);

  const previewSize = useMemo(
    () => ({ width: document.canvas.width, height: document.canvas.height }),
    [document.canvas.height, document.canvas.width],
  );

  const fitToViewport = useCallback(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const availableWidth = Math.max(1, container.clientWidth - 48);
    const availableHeight = Math.max(1, container.clientHeight - 48);
    setScale(
      Number(
        Math.min(
          1,
          availableWidth / Math.max(1, previewSize.width),
          availableHeight / Math.max(1, previewSize.height),
        ).toFixed(3),
      ),
    );
  }, [previewSize.height, previewSize.width]);

  useEffect(() => {
    const element = previewContainerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fitToViewport);
    observer.observe(element);
    fitToViewport();
    return () => observer.disconnect();
  }, [fitToViewport]);

  useEffect(() => {
    const root = exportRootRef.current;
    if (!root) return;
    let cancelled = false;
    const images = Array.from(root.querySelectorAll("img"));
    const backgroundImages = Array.from(
      root.querySelectorAll<HTMLElement>("[style]"),
    ).flatMap((element) => {
      const backgroundImage = window.getComputedStyle(element).backgroundImage;
      return [...backgroundImage.matchAll(/url\((?:["']?)(.*?)(?:["']?)\)/g)]
        .map((match) => match[1])
        .filter((source): source is string => Boolean(source))
        .map((source) => {
          const image = new Image();
          image.src = source;
          return image;
        });
    });
    const errors: string[] = [];
    const updateImages = () => {
      if (cancelled) return;
      const allImages = [...images, ...backgroundImages];
      const imagesReady = allImages.every(
        (image) => image.complete && image.naturalWidth > 0,
      );
      setReadiness((current) => ({
        ...current,
        imagesReady,
        blockingErrors: [
          ...current.blockingErrors.filter(
            (message) => !message.startsWith("이미지 로딩 실패:"),
          ),
          ...errors,
        ],
      }));
    };

    [...images, ...backgroundImages].forEach((image) => {
      image.addEventListener("load", updateImages);
      image.addEventListener("error", () => {
        errors.push(`이미지 로딩 실패: ${image.alt || "image"}`);
        updateImages();
      });
    });
    const frame = window.requestAnimationFrame(() => {
      setReadiness((current) => ({ ...current, layoutReady: true }));
      updateImages();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      [...images, ...backgroundImages].forEach((image) => {
        image.removeEventListener("load", updateImages);
      });
    };
  }, [runtimeImageOverrides, runtimeValues]);

  const handleFontLoadStateChange = useCallback(
    (state: StudioWebFontLoadState) => {
      setReadiness((current) => ({
        ...current,
        fontsReady: state === "idle" || state === "loaded",
        blockingErrors:
          state === "error"
            ? ["웹 폰트를 불러오지 못했습니다."]
            : current.blockingErrors.filter(
                (message) => message !== "웹 폰트를 불러오지 못했습니다.",
              ),
      }));
    },
    [],
  );

  const isReady =
    readiness.fontsReady &&
    readiness.imagesReady &&
    readiness.layoutReady &&
    readiness.blockingErrors.length === 0;

  const exportPng = async () => {
    const root = exportRootRef.current;
    if (!root || isExporting || !isReady) return;
    setIsExporting(true);
    try {
      if (window.document.fonts) await window.document.fonts.ready;
      const transparent =
        document.domains?.thumbnail?.export.transparentBackground === true;
      await exportStudioPng(root, {
        width: previewSize.width,
        height: previewSize.height,
        pixelRatio: 1,
        background: transparent ? null : document.canvas.background,
        fileName: buildStudioExportFileName(templateName),
      });
    } catch (error) {
      console.error("Thumbnail runtime PNG export failed", error);
      setReadiness((current) => ({
        ...current,
        blockingErrors: ["PNG를 생성하지 못했습니다. 다시 시도해 주세요."],
      }));
    } finally {
      setIsExporting(false);
    }
  };

  const resetRuntime = () => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
    setRuntimeImageOverrides({});
  };

  return (
    <main className="flex min-h-screen w-full flex-col overflow-hidden bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--runtime-fg-muted)] hover:text-[var(--runtime-fg)]"
            href={backHref}
          >
            <ChevronLeft size={15} /> 돌아가기
          </Link>
          <div className="h-5 w-px bg-[var(--runtime-border)]" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black">{templateName}</h1>
            <p className="text-[10px] font-semibold text-[var(--runtime-fg-muted)]">
              Thumbnail · revision {revisionNo}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="hidden h-8 items-center gap-1 rounded-lg border border-[var(--runtime-border)] px-2 text-[11px] font-bold text-[var(--runtime-fg-muted)] hover:text-[var(--runtime-fg)] sm:inline-flex"
            type="button"
            onClick={resetRuntime}
          >
            <RefreshCw size={13} /> 초기화
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--runtime-primary)] px-3 text-xs font-black text-white transition hover:bg-[var(--runtime-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isReady || isExporting}
            type="button"
            onClick={() => void exportPng()}
          >
            <Download size={14} /> {isExporting ? "생성 중..." : "PNG 다운로드"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section
          ref={previewContainerRef}
          className="relative min-h-[48vh] min-w-0 flex-1 overflow-hidden bg-[#242424]"
        >
          <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/50 px-3 py-2 text-[10px] font-bold text-white/80">
            {Math.round(scale * 100)}% · {previewSize.width} ×{" "}
            {previewSize.height}
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden p-6"
            onDoubleClick={fitToViewport}
          >
            <div
              style={{
                height: previewSize.height * scale,
                width: previewSize.width * scale,
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <StudioExportRoot
                  ref={exportRootRef}
                  document={document}
                  onFontLoadStateChange={handleFontLoadStateChange}
                  runtimeImageOverrides={runtimeImageOverrides}
                  runtimeValues={runtimeValues}
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-2 text-[10px] font-semibold">
            <span
              className={
                readiness.fontsReady
                  ? "rounded bg-emerald-500/80 px-2 py-1 text-white"
                  : "rounded bg-black/60 px-2 py-1 text-white/80"
              }
            >
              폰트 {readiness.fontsReady ? "준비됨" : "대기"}
            </span>
            <span
              className={
                readiness.imagesReady
                  ? "rounded bg-emerald-500/80 px-2 py-1 text-white"
                  : "rounded bg-black/60 px-2 py-1 text-white/80"
              }
            >
              이미지 {readiness.imagesReady ? "준비됨" : "대기"}
            </span>
            {readiness.blockingErrors.map((message) => (
              <span
                className="rounded bg-rose-500/90 px-2 py-1 text-white"
                key={message}
              >
                {message}
              </span>
            ))}
          </div>
        </section>
        <ThumbnailRuntimeForm
          document={document}
          initialRuntimeValues={initialRuntimeValues}
          runtimeImageOverrides={runtimeImageOverrides}
          runtimeValues={runtimeValues}
          setRuntimeImageOverrides={setRuntimeImageOverrides}
          setRuntimeValues={setRuntimeValues}
          storageOwnerId={storageOwnerId}
          templateId={templateId}
          onReset={resetRuntime}
        />
      </div>
    </main>
  );
}
