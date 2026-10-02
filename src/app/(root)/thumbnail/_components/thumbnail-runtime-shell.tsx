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
import { getStudioRuntimeInputValue } from "@/utils/template-studio/input-values";
import { getThumbnailStudioInputDefinitions } from "@/utils/thumbnail-studio/input-order";
import { ThumbnailRuntimeForm } from "./thumbnail-runtime-form";
import { useThumbnailUserImages } from "./use-thumbnail-user-images";
import {
  expandThumbnailUserImages,
  isThumbnailUserImagesInput,
} from "@/utils/thumbnail-studio/user-images";
import { StudioRuntimeImageTransformOverlay } from "@/components/studio/runtime/studio-runtime-image-transform-overlay";
import {
  createThumbnailRuntimeImageOverrides,
  fromRuntimeImageTransform,
  getRuntimeImageFitGeometry,
  toRuntimeImageTransform,
  type StudioRuntimeImageOverrides,
} from "@/utils/thumbnail-studio/runtime-image-transform";
import {
  formatStudioImageObjectPosition,
  getStudioImageObjectPosition,
} from "@/utils/thumbnail-studio/image-object-position";
import { getStudioImageInputPolicy } from "@/utils/thumbnail-studio/image-input-policy";

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
  const [runtimeImageOverrides, setRuntimeImageOverrides] =
    useState<StudioRuntimeImageOverrides>(() =>
      createThumbnailRuntimeImageOverrides(document),
    );
  const [activeImage, setActiveImage] = useState<{
    inputId: string;
    nodeId: string;
  } | null>(null);
  const addons = useThumbnailUserImages(
    document,
    storageOwnerId,
    templateId,
    runtimeImageOverrides,
    setRuntimeImageOverrides,
  );
  const expanded = useMemo(
    () =>
      expandThumbnailUserImages(
        document,
        runtimeValues,
        addons.images,
        runtimeImageOverrides,
      ),
    [document, runtimeValues, addons.images, runtimeImageOverrides],
  );
  // Keep the overlay's document stable during pointer gestures; only visibility changes rebuild it.
  const removedImageKey = JSON.stringify(
    Object.entries(runtimeImageOverrides)
      .filter(([, override]) => override.removed)
      .map(([id]) => id),
  );
  const visibilityOverrides = useMemo<StudioRuntimeImageOverrides>(
    () =>
      Object.fromEntries(
        (JSON.parse(removedImageKey) as string[]).map((id) => [
          id,
          { removed: true },
        ]),
      ),
    [removedImageKey],
  );
  const runtimeDocument = useMemo(
    () =>
      expandThumbnailUserImages(
        document,
        runtimeValues,
        addons.images,
        visibilityOverrides,
      ).document,
    [document, runtimeValues, addons.images, visibilityOverrides],
  );
  const activeImageInput = activeImage
    ? runtimeDocument.inputs[activeImage.inputId]
    : undefined;
  const activeNodeId =
    activeImage &&
    isThumbnailUserImagesInput(
      document.inputs[activeImage.inputId] ?? { type: "" },
    )
      ? `${activeImage.nodeId}:background`
      : activeImage?.nodeId;
  const resetImageAdjustment = (
    inputId: string,
    preserveIntrinsicSize = true,
  ) => {
    setRuntimeImageOverrides((current) => {
      const next = { ...current };
      const intrinsicSize = current[inputId]?.intrinsicSize;
      if (preserveIntrinsicSize && intrinsicSize)
        next[inputId] = { intrinsicSize };
      else delete next[inputId];
      return next;
    });
    setActiveImage((current) =>
      current?.inputId === inputId ? null : current,
    );
  };
  const scaleActiveImage = (factor: number) => {
    if (
      !activeImage ||
      activeImageInput?.type !== "image" ||
      !getStudioImageInputPolicy(activeImageInput.policy).allowFitChange
    )
      return;
    const slot = Array.from(
      exportRootRef.current?.querySelectorAll<HTMLElement>(
        "[data-studio-image-slot]",
      ) ?? [],
    ).find((element) => element.dataset.studioImageSlot === activeNodeId);
    const image = slot?.querySelector("img");
    if (
      !slot ||
      !image?.naturalWidth ||
      !slot.offsetWidth ||
      !slot.offsetHeight
    )
      return;
    const node = runtimeDocument.graph.nodes[activeNodeId ?? ""];
    if (!node) return;
    const size = { width: slot.offsetWidth, height: slot.offsetHeight };
    setRuntimeImageOverrides((current) => {
      const override = current[activeImage.inputId];
      const transform = override?.transforms?.[activeImage.nodeId];
      const geometry = transform
        ? fromRuntimeImageTransform(transform, size)
        : getRuntimeImageFitGeometry({
            ...size,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            fit: override?.fit ?? node.fit ?? "cover",
            intrinsicSize: override?.fit ? undefined : override?.intrinsicSize,
            objectPosition:
              override?.objectPosition ??
              formatStudioImageObjectPosition(
                getStudioImageObjectPosition(
                  node.styleId ? document.styles[node.styleId] : undefined,
                ),
              ),
          });
      const multiplier = Math.max(
        factor,
        4 / geometry.width,
        4 / geometry.height,
      );
      const next = {
        ...geometry,
        width: geometry.width * multiplier,
        height: geometry.height * multiplier,
      };
      next.left += (geometry.width - next.width) / 2;
      next.top += (geometry.height - next.height) / 2;
      return {
        ...current,
        [activeImage.inputId]: {
          ...override,
          transforms: {
            ...override?.transforms,
            [activeImage.nodeId]: toRuntimeImageTransform(
              next,
              size,
              transform?.rotateDeg ?? 0,
            ),
          },
        },
      };
    });
  };

  useEffect(() => {
    if (!activeImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImage]);
  const [isExporting, setIsExporting] = useState(false);
  const [readiness, setReadiness] = useState<RenderReadiness>({
    fontsReady: false,
    imagesReady: false,
    layoutReady: false,
    blockingErrors: [],
  });

  useEffect(() => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
    setRuntimeImageOverrides(createThumbnailRuntimeImageOverrides(document));
    setActiveImage(null);
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
  }, [document, runtimeValues, addons.images]);

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
    readiness.blockingErrors.length === 0 &&
    addons.loaded;
  const missingRequiredInputLabels = useMemo(
    () =>
      getThumbnailStudioInputDefinitions(document)
        .filter(
          (input) =>
            input.required &&
            (!getStudioRuntimeInputValue(input, runtimeValues).trim() ||
              runtimeImageOverrides[input.id]?.removed === true),
        )
        .map((input) => input.label),
    [document, runtimeValues, runtimeImageOverrides],
  );
  const isExportReady = isReady && missingRequiredInputLabels.length === 0;
  const readinessMessage = readiness.blockingErrors[0]
    ? readiness.blockingErrors[0]
    : missingRequiredInputLabels.length > 0
      ? `필수 입력을 입력해주세요: ${missingRequiredInputLabels.join(", ")}`
      : isReady
        ? undefined
        : "리소스 준비 중…";

  const exportPng = async () => {
    const root = exportRootRef.current;
    if (!root || isExporting || !isExportReady) return;
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
    setRuntimeImageOverrides(createThumbnailRuntimeImageOverrides(document));
    setActiveImage(null);
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
            document={runtimeDocument}
            onFontLoadStateChange={handleFontLoadStateChange}
            runtimeImageOverrides={expanded.runtimeImageOverrides}
            runtimeValues={expanded.runtimeValues}
          />
          {activeImage && activeImageInput?.type === "image" ? (
            <StudioRuntimeImageTransformOverlay
              key={`${activeImage.inputId}:${activeImage.nodeId}`}
              document={runtimeDocument}
              inputId={activeImage.inputId}
              nodeId={activeNodeId!}
              imageSrc={getStudioRuntimeInputValue(
                activeImageInput,
                expanded.runtimeValues,
              )}
              exportRootRef={exportRootRef}
              viewportTransform={viewport.viewportTransform}
              override={expanded.runtimeImageOverrides[activeImage.inputId]}
              onChange={(transform) =>
                setRuntimeImageOverrides((current) => ({
                  ...current,
                  [activeImage.inputId]: {
                    ...current[activeImage.inputId],
                    transforms: {
                      ...current[activeImage.inputId]?.transforms,
                      [activeImage.nodeId]: transform,
                    },
                  },
                }))
              }
            />
          ) : null}
        </StudioRuntimePreviewWorkspace>
        <ThumbnailRuntimeForm
          document={document}
          initialRuntimeValues={initialRuntimeValues}
          runtimeImageOverrides={runtimeImageOverrides}
          runtimeValues={runtimeValues}
          setRuntimeImageOverrides={setRuntimeImageOverrides}
          setRuntimeValues={setRuntimeValues}
          activeImage={activeImage}
          onAdjustImage={setActiveImage}
          onResetImageAdjustment={resetImageAdjustment}
          onScaleImage={scaleActiveImage}
          addonImages={addons.images}
          setAddonImages={addons.setImages}
          addonsLoaded={addons.loaded}
          imageStorageError={addons.storageError}
          storageOwnerId={storageOwnerId}
          templateId={templateId}
          templateName={templateName}
          revisionNo={revisionNo}
          exportDisabled={!isExportReady || isExporting}
          isExporting={isExporting}
          readinessMessage={readinessMessage}
          onExport={() => void exportPng()}
          onReset={resetRuntime}
        />
      </div>
    </main>
  );
}
