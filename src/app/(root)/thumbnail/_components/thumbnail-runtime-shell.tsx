"use client";

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
import { StudioRuntimePreviewWorkspace } from "@/components/studio/runtime/studio-runtime-preview-workspace";
import { useStudioRuntimeViewport } from "@/components/studio/runtime/use-studio-runtime-viewport";
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

  const viewport = useStudioRuntimeViewport(previewSize);

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
  const readinessMessage = readiness.blockingErrors[0]
    ? readiness.blockingErrors[0]
    : isReady
      ? undefined
      : "리소스 준비 중…";

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
        blockingErrors: [
          error instanceof Error
            ? error.message
            : "PNG를 생성하지 못했습니다. 다시 시도해 주세요.",
        ],
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
    <main className="studio-runtime-theme flex h-screen w-full flex-col overflow-hidden bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)]">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:items-center">
        <StudioRuntimePreviewWorkspace
          backHref={backHref}
          backLabel="돌아가기"
          controlsTestId="thumbnail-runtime-preview-controls"
          previewAreaTestId="thumbnail-runtime-preview-area"
          previewSize={previewSize}
          scaleInputId="thumbnail-runtime-preview-scale"
          viewport={viewport}
        >
          <StudioExportRoot
            ref={exportRootRef}
            document={document}
            onFontLoadStateChange={handleFontLoadStateChange}
            runtimeImageOverrides={runtimeImageOverrides}
            runtimeValues={runtimeValues}
          />
        </StudioRuntimePreviewWorkspace>
        <ThumbnailRuntimeForm
          document={document}
          initialRuntimeValues={initialRuntimeValues}
          runtimeImageOverrides={runtimeImageOverrides}
          runtimeValues={runtimeValues}
          setRuntimeImageOverrides={setRuntimeImageOverrides}
          setRuntimeValues={setRuntimeValues}
          storageOwnerId={storageOwnerId}
          templateId={templateId}
          templateName={templateName}
          revisionNo={revisionNo}
          exportDisabled={!isReady || isExporting}
          isExporting={isExporting}
          readinessMessage={readinessMessage}
          onExport={() => void exportPng()}
          onReset={resetRuntime}
        />
      </div>
    </main>
  );
}
