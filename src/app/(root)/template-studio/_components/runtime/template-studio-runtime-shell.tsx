"use client";

import { ChevronLeft } from "lucide-react";
import { domToPng } from "modern-screenshot";
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
import {
  getStudioRuntimeCopy,
  isStudioRuntimeLocale,
  normalizeStudioRuntimeLocale,
  STUDIO_RUNTIME_LOCALE_COOKIE_KEY,
  STUDIO_RUNTIME_LOCALE_OPTIONS,
  STUDIO_RUNTIME_LOCALE_STORAGE_KEY,
  type StudioRuntimeLocale,
} from "@/utils/template-studio/runtime-i18n";
import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import { clampStudioPreviewScale } from "../../../../../components/studio/canvas/studio-canvas-viewport";
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
  backHref?: string;
  /** When provided, the form shows a "저장" action that persists runtimeValues (user-run mode). */
  onSaveValues?: (runtimeValues: StudioRuntimeValues) => Promise<void>;
  /** Stable identity for this browser's local (IndexedDB) runtime image storage. User-run mode only. */
  storageOwnerId?: string | null;
}

const cloneRuntimeValues = (
  runtimeValues: StudioRuntimeValues,
): StudioRuntimeValues =>
  JSON.parse(JSON.stringify(runtimeValues)) as StudioRuntimeValues;

const zoomStep = 0.1;

export function TemplateStudioRuntimeShell({
  document,
  initialRuntimeValues,
  templateId,
  templateName,
  backHref: backHrefProp,
  onSaveValues,
  storageOwnerId,
}: TemplateStudioRuntimeShellProps) {
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [runtimeValues, setRuntimeValues] = useState<StudioRuntimeValues>(() =>
    cloneRuntimeValues(initialRuntimeValues),
  );
  const [locale, setLocale] = useState<StudioRuntimeLocale>("en");
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
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isSavingValues, setIsSavingValues] = useState(false);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const timetable = document.domains?.timetable;
  const copy = getStudioRuntimeCopy(locale);
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

    const availableWidth = Math.max(1, element.clientWidth - 64);
    const availableHeight = Math.max(1, element.clientHeight - 64);
    const fitScale = clampStudioPreviewScale(
      Math.min(
        1,
        availableWidth / Math.max(1, previewSize.width),
        availableHeight / Math.max(1, previewSize.height),
      ),
    );

    setViewportTransform({
      scale: Number(fitScale.toFixed(3)),
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
            pointerY - rect.height / 2 + nextHeight / 2 - localY * clampedScale,
        };
      });
    },
    [previewSize.height, previewSize.width],
  );

  const displayName =
    templateName?.trim() || document.metadata.name || "Template Studio Preview";
  const backHref =
    backHrefProp ??
    (templateId
      ? `/admin/template-studio/${templateId}/edit`
      : "/admin/template-studio");

  useEffect(() => {
    const queryLocale = new URLSearchParams(window.location.search).get("lang");
    if (isStudioRuntimeLocale(queryLocale)) {
      setLocale(queryLocale);
      return;
    }

    let storedLocale: string | null = null;
    try {
      storedLocale = window.localStorage.getItem(
        STUDIO_RUNTIME_LOCALE_STORAGE_KEY,
      );
    } catch {
      storedLocale = null;
    }

    if (isStudioRuntimeLocale(storedLocale)) {
      setLocale(storedLocale);
      return;
    }

    let cookieLocale: string | undefined;
    try {
      cookieLocale = (
        typeof window.document.cookie === "string" ? window.document.cookie : ""
      )
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(`${STUDIO_RUNTIME_LOCALE_COOKIE_KEY}=`))
        ?.split("=")[1];
    } catch {
      cookieLocale = undefined;
    }
    if (isStudioRuntimeLocale(cookieLocale)) {
      setLocale(cookieLocale);
      return;
    }

    const browserLocale =
      window.navigator.languages?.[0] ?? window.navigator.language;
    setLocale(normalizeStudioRuntimeLocale(browserLocale));
  }, []);

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

  const updateLocale = (nextLocale: StudioRuntimeLocale) => {
    setLocale(nextLocale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLocale);
    window.history.replaceState(null, "", url);
    try {
      window.localStorage.setItem(
        STUDIO_RUNTIME_LOCALE_STORAGE_KEY,
        nextLocale,
      );
    } catch {
      // A blocked storage API must not prevent changing the active UI locale.
    }
    try {
      window.document.cookie = `${STUDIO_RUNTIME_LOCALE_COOKIE_KEY}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // URL state remains available when cookies are blocked.
    }
  };

  const handleViewportWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      const direction = event.deltaY > 0 ? -1 : 1;
      const multiplier = event.shiftKey ? 2 : 1;
      updateScale(viewportTransform.scale + direction * zoomStep * multiplier, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
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

  const stopPanning = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (panStateRef.current?.pointerId === event.pointerId) {
        panStateRef.current = null;
        setIsPanning(false);
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const savePreviewImage = useCallback(async () => {
    const element = previewContentRef.current;
    if (!element || isSavingImage) return;

    setIsSavingImage(true);
    try {
      // 폰트가 준비되기 전에 캡처하면 fallback 폰트가 결과 이미지에 굳는다. 화면에는
      // 제대로 보이므로 사용자는 내려받은 파일을 열어 보고서야 알게 된다.
      if (window.document.fonts) {
        await window.document.fonts.ready;
      }

      /**
       * 래스터라이저는 `modern-screenshot` 하나로 둔다.
       *
       * Phase 0A 스파이크가 표준으로 정한 것이고, 시간표 카드와 같은 조건으로 재 봤을 때
       * `html-to-image`보다 화면과 더 잘 맞거나 같았다. 어긋난 장면은 자동 크기 글자가
       * 상자 높이를 거의 채우는 쪽이었다. 두 줄짜리 제목과 높이가 빡빡한 부제목이다.
       * 화면에서는 아무 문제가 없고 내려받은 파일에서만 드러나므로 눈에 띄기까지 오래 걸린다.
       *
       * 옵션 대응: `pixelRatio` → `scale`, `cacheBust` → `fetch.bypassingCache`.
       */
      const dataUrl = await domToPng(element, {
        fetch: { bypassingCache: true },
        height: previewSize.height,
        scale: 1,
        style: {
          transform: "none",
        },
        width: previewSize.width,
      });
      const safeName =
        displayName
          .trim()
          .replace(/[^a-zA-Z0-9가-힣ぁ-んァ-ン一-龯_-]+/g, "-")
          .replace(/^-+|-+$/g, "") || "timetable";
      const link = window.document.createElement("a");
      link.download = `${safeName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Template Studio preview image export failed", error);
      window.alert(copy.saveImageFailed);
    } finally {
      setIsSavingImage(false);
    }
  }, [
    copy.saveImageFailed,
    displayName,
    isSavingImage,
    previewSize.height,
    previewSize.width,
  ]);

  const saveValues = useCallback(async () => {
    if (!onSaveValues || isSavingValues) return;

    setIsSavingValues(true);
    try {
      await onSaveValues(runtimeValues);
    } catch (error) {
      console.error("Template Studio runtime value save failed", error);
      window.alert(copy.saveFailed);
    } finally {
      setIsSavingValues(false);
    }
  }, [copy.saveFailed, isSavingValues, onSaveValues, runtimeValues]);

  return (
    <main
      className="template-studio-runtime-theme flex h-screen w-full flex-col overflow-hidden bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)]"
      lang={locale}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:items-center">
        <section
          className="relative h-full min-h-0 flex-1 overflow-hidden bg-[var(--runtime-form-bg)]"
          data-testid="template-studio-preview-area"
          ref={previewContainerRef}
        >
          <div
            className="absolute left-4 top-4 z-50 flex select-none items-center gap-4 rounded bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm"
            data-testid="template-studio-preview-controls"
          >
            <Link
              className="flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              href={backHref}
            >
              <ChevronLeft className="mr-1 size-4" />
              {copy.back}
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center">
              <label
                className="text-sm font-medium text-gray-600"
                htmlFor="template-studio-preview-scale"
              >
                {copy.previewScale}: {viewportTransform.scale.toFixed(1)}x
              </label>
              <input
                aria-label={copy.previewScale}
                className="ml-2 h-2 w-32 appearance-none rounded-lg bg-gray-300 accent-[var(--runtime-primary)] sm:w-60 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--runtime-primary)] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--runtime-primary)] [&::-webkit-slider-thumb]:shadow-md"
                id="template-studio-preview-scale"
                max={2}
                min={0.1}
                step={0.1}
                type="range"
                value={viewportTransform.scale}
                onChange={(event) =>
                  updateScale(Number.parseFloat(event.currentTarget.value))
                }
              />
            </div>
            <div className="hidden h-6 w-px bg-gray-300 sm:block" />
            <select
              aria-label={copy.language}
              className="hidden h-8 shrink-0 rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] px-2 text-xs font-bold text-[var(--runtime-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--runtime-focus)] sm:block"
              value={locale}
              onChange={(event) =>
                updateLocale(event.currentTarget.value as StudioRuntimeLocale)
              }
            >
              {STUDIO_RUNTIME_LOCALE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
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
              className="relative shrink-0 rounded-sm shadow-lg"
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
                <div
                  data-testid="template-studio-preview-content"
                  ref={previewContentRef}
                  style={{
                    height: previewSize.height,
                    width: previewSize.width,
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
          </div>
        </section>

        <TemplateStudioRuntimeForm
          document={document}
          isSavingImage={isSavingImage}
          isSavingValues={isSavingValues}
          locale={locale}
          runtimeValues={runtimeValues}
          setRuntimeValues={setRuntimeValues}
          storageOwnerId={storageOwnerId}
          templateId={templateId}
          onReset={resetRuntimeValues}
          onSaveImage={() => {
            void savePreviewImage();
          }}
          onSaveValues={
            onSaveValues
              ? () => {
                  void saveValues();
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}
