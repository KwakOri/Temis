"use client";

import { cva } from "class-variance-authority";
import { Check, LockKeyhole, RotateCcw, UnlockKeyhole, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Cropper, {
  type Area,
  type MediaSize,
  type Point,
} from "react-easy-crop";

import {
  getStudioRuntimeCopy,
  type StudioRuntimeLocale,
} from "@/utils/template-studio/runtime-i18n";
import {
  fitStudioCropFrame,
  getStudioCropOutputSize,
  resizeStudioCropFrame,
  type StudioCropFrameSize,
  type StudioCropResizeEdge,
} from "@/utils/template-studio/crop-resize";
import { StudioRuntimeActionButton } from "@/components/studio/runtime/ui/studio-runtime-action-button";
import { studioRuntimeFocusRingClass } from "@/components/studio/runtime/ui/studio-runtime-ui";

interface StudioRuntimeImageCropModalProps {
  imageSrc: string;
  locale: StudioRuntimeLocale;
  targetHeight: number;
  targetWidth: number;
  allowFreeCrop?: boolean;
  onCancel: () => void;
  onApply: (croppedImageBlob: Blob) => void | Promise<void>;
}

const cropHandleVariants = cva(
  `pointer-events-auto absolute touch-none ${studioRuntimeFocusRingClass}`,
  {
    variants: {
      edge: {
        left: "-left-3 top-0 h-full w-6 cursor-ew-resize",
        right: "-right-3 top-0 h-full w-6 cursor-ew-resize",
        top: "-top-3 left-0 h-6 w-full cursor-ns-resize",
        bottom: "-bottom-3 left-0 h-6 w-full cursor-ns-resize",
      },
    },
  },
);

interface CropResizeSession {
  edge: StudioCropResizeEdge;
  startX: number;
  startY: number;
  frame: StudioCropFrameSize;
  stage: StudioCropFrameSize;
}

const clampDimension = (value: number) =>
  Math.min(10000, Math.max(1, Math.round(value || 1)));

const rotateSize = (width: number, height: number, rotation: number) => {
  const radians = (rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(radians) * width) +
      Math.abs(Math.sin(radians) * height),
    height:
      Math.abs(Math.sin(radians) * width) +
      Math.abs(Math.cos(radians) * height),
  };
};

const createRuntimeCroppedImage = (
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  outputWidth: number,
  outputHeight: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const workingCanvas = document.createElement("canvas");
        const workingContext = workingCanvas.getContext("2d");
        if (!workingContext) {
          throw new Error("Canvas context is unavailable.");
        }

        const rotated = rotateSize(image.width, image.height, rotation);
        workingCanvas.width = Math.ceil(rotated.width);
        workingCanvas.height = Math.ceil(rotated.height);
        workingContext.translate(
          workingCanvas.width / 2,
          workingCanvas.height / 2,
        );
        workingContext.rotate((rotation * Math.PI) / 180);
        workingContext.drawImage(image, -image.width / 2, -image.height / 2);

        const outputCanvas = document.createElement("canvas");
        const outputContext = outputCanvas.getContext("2d");
        if (!outputContext) {
          throw new Error("Crop context is unavailable.");
        }

        outputCanvas.width = clampDimension(outputWidth);
        outputCanvas.height = clampDimension(outputHeight);
        outputContext.drawImage(
          workingCanvas,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          outputCanvas.width,
          outputCanvas.height,
        );
        // A Blob keeps the cropped PNG out of Data URL / string-based
        // storage entirely — it goes straight into IndexedDB, never through
        // runtime_values JSON.
        outputCanvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to encode the cropped image."));
            return;
          }
          resolve(blob);
        }, "image/png");
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = imageSrc;
  });

export function StudioRuntimeImageCropModal({
  imageSrc,
  locale,
  targetHeight,
  targetWidth,
  allowFreeCrop = false,
  onCancel,
  onApply,
}: StudioRuntimeImageCropModalProps) {
  const copy = getStudioRuntimeCopy(locale);
  const targetAspect =
    clampDimension(targetWidth) / clampDimension(targetHeight);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAspectLocked, setIsAspectLocked] = useState(!allowFreeCrop);
  const [cropFrameSize, setCropFrameSize] =
    useState<StudioCropFrameSize | null>(null);
  const cropStageRef = useRef<HTMLDivElement>(null);
  const frameAspectRef = useRef(targetAspect);
  const resizeSessionRef = useRef<CropResizeSession | null>(null);
  const aspect =
    !isAspectLocked && cropFrameSize
      ? cropFrameSize.width / cropFrameSize.height
      : targetAspect;
  const { width: outputWidth, height: outputHeight } = getStudioCropOutputSize(
    croppedAreaPixels ?? { width: targetWidth, height: targetHeight },
    { width: targetWidth, height: targetHeight },
    isAspectLocked,
  );
  const minimumZoom =
    allowFreeCrop && cropFrameSize && mediaSize
      ? Math.max(
          0.1,
          cropFrameSize.width / mediaSize.width,
          cropFrameSize.height / mediaSize.height,
        )
      : 1;
  const maximumZoom = Math.max(3, minimumZoom);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setMediaSize(null);
    setCroppedAreaPixels(null);
    setErrorMessage("");
    setIsAspectLocked(!allowFreeCrop);
    frameAspectRef.current = targetAspect;
    resizeSessionRef.current = null;
    const stage = cropStageRef.current;
    if (allowFreeCrop && stage) {
      setCropFrameSize(
        fitStudioCropFrame(
          { width: stage.clientWidth, height: stage.clientHeight },
          targetAspect,
        ),
      );
    }
  }, [imageSrc, targetHeight, targetWidth, targetAspect, allowFreeCrop]);

  useEffect(() => {
    const stage = cropStageRef.current;
    if (!allowFreeCrop || !stage) return;
    const observer = new ResizeObserver(() => {
      setCropFrameSize(
        fitStudioCropFrame(
          { width: stage.clientWidth, height: stage.clientHeight },
          frameAspectRef.current,
        ),
      );
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [allowFreeCrop]);

  useEffect(() => {
    if (zoom < minimumZoom) setZoom(minimumZoom);
  }, [minimumZoom, zoom]);

  const updateCropFrame = (frame: StudioCropFrameSize) => {
    frameAspectRef.current = frame.width / frame.height;
    setCroppedAreaPixels(null);
    setCropFrameSize(frame);
  };

  const toggleAspectLock = () => {
    const stage = cropStageRef.current;
    if (!isAspectLocked && stage) {
      updateCropFrame(
        fitStudioCropFrame(
          { width: stage.clientWidth, height: stage.clientHeight },
          targetAspect,
        ),
      );
    }
    setIsAspectLocked(!isAspectLocked);
    resizeSessionRef.current = null;
  };

  const handleResizeStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    edge: StudioCropResizeEdge,
  ) => {
    const stage = cropStageRef.current;
    if (isAspectLocked || !cropFrameSize || !stage) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeSessionRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      frame: cropFrameSize,
      stage: { width: stage.clientWidth, height: stage.clientHeight },
    };
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = resizeSessionRef.current;
    if (!session) return;
    event.preventDefault();
    event.stopPropagation();
    const delta =
      session.edge === "right"
        ? event.clientX - session.startX
        : session.edge === "left"
          ? session.startX - event.clientX
          : session.edge === "bottom"
            ? event.clientY - session.startY
            : session.startY - event.clientY;
    updateCropFrame(
      resizeStudioCropFrame(session.frame, session.stage, session.edge, delta),
    );
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    resizeSessionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleResizeKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    edge: StudioCropResizeEdge,
  ) => {
    const stage = cropStageRef.current;
    const horizontal = edge === "left" || edge === "right";
    const keys = horizontal
      ? ["ArrowLeft", "ArrowRight"]
      : ["ArrowUp", "ArrowDown"];
    if (isAspectLocked || !cropFrameSize || !stage || !keys.includes(event.key))
      return;
    event.preventDefault();
    event.stopPropagation();
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const sign = edge === "left" || edge === "top" ? -1 : 1;
    updateCropFrame(
      resizeStudioCropFrame(
        cropFrameSize,
        { width: stage.clientWidth, height: stage.clientHeight },
        edge,
        direction * sign * (event.shiftKey ? 10 : 1),
      ),
    );
  };

  const resetView = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setErrorMessage("");
    const stage = cropStageRef.current;
    if (allowFreeCrop && stage) {
      updateCropFrame(
        fitStudioCropFrame(
          { width: stage.clientWidth, height: stage.clientHeight },
          targetAspect,
        ),
      );
    }
  };

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage("");
    try {
      await onApply(
        await createRuntimeCroppedImage(
          imageSrc,
          croppedAreaPixels,
          rotation,
          outputWidth,
          outputHeight,
        ),
      );
    } catch (error) {
      console.error("Template Studio runtime image crop failed:", error);
      setErrorMessage(copy.cropFailed);
    } finally {
      setIsProcessing(false);
    }
  }, [
    copy.cropFailed,
    croppedAreaPixels,
    imageSrc,
    isProcessing,
    onApply,
    outputHeight,
    outputWidth,
    rotation,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isProcessing) onCancel();
      }
      if (event.key === "Enter") {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest("button, input, select, textarea")
        )
          return;
        event.preventDefault();
        void handleApply();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApply, isProcessing, onCancel]);

  return (
    <div
      aria-describedby={
        allowFreeCrop ? undefined : "studio-runtime-crop-description"
      }
      aria-label={copy.cropImage}
      aria-modal="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      data-testid="studio-runtime-image-crop-modal"
      role="dialog"
      onPointerDown={(event) => {
        if (!isProcessing && event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--runtime-border-strong)] bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)] shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:max-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--runtime-border)] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-black">{copy.cropImage}</h2>
            {!allowFreeCrop ? (
              <p
                className="mt-1 text-xs font-medium text-[var(--runtime-fg-muted)]"
                id="studio-runtime-crop-description"
              >
                {copy.cropDescription}
              </p>
            ) : null}
          </div>
          <button
            aria-label={copy.cancel}
            disabled={isProcessing}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--runtime-fg-muted)] transition hover:bg-[var(--runtime-input-hover)] hover:text-[var(--runtime-fg)]"
            type="button"
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {allowFreeCrop ? (
            <div className="mb-3 flex justify-end">
              <StudioRuntimeActionButton
                aria-pressed={isAspectLocked}
                disabled={isProcessing}
                size="compact"
                variant="secondary"
                onClick={toggleAspectLock}
              >
                {isAspectLocked ? (
                  <LockKeyhole size={14} />
                ) : (
                  <UnlockKeyhole size={14} />
                )}
                {isAspectLocked ? copy.cropAspectLocked : copy.cropAspectFree}
              </StudioRuntimeActionButton>
            </div>
          ) : null}
          <div
            ref={cropStageRef}
            className="relative h-[min(55vh,520px)] min-h-72 overflow-hidden rounded-xl border border-[var(--runtime-border-strong)] bg-[#161616]"
            style={isProcessing ? { pointerEvents: "none" } : undefined}
          >
            <Cropper
              aspect={aspect}
              crop={crop}
              cropSize={
                allowFreeCrop ? (cropFrameSize ?? undefined) : undefined
              }
              image={imageSrc}
              maxZoom={maximumZoom}
              minZoom={minimumZoom}
              rotation={rotation}
              showGrid
              zoom={zoom}
              onCropChange={setCrop}
              onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
              onMediaLoaded={setMediaSize}
              onZoomChange={setZoom}
            />
            {allowFreeCrop && !isAspectLocked && cropFrameSize ? (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: cropFrameSize.width,
                  height: cropFrameSize.height,
                }}
              >
                {(["left", "right", "top", "bottom"] as const).map((edge) => (
                  <button
                      key={edge}
                      aria-label={`Resize ${edge} crop edge`}
                      disabled={isProcessing}
                    className={cropHandleVariants({ edge })}
                    type="button"
                    onPointerDown={(event) => handleResizeStart(event, edge)}
                    onPointerMove={handleResizeMove}
                    onPointerUp={handleResizeEnd}
                    onPointerCancel={handleResizeEnd}
                    onLostPointerCapture={handleResizeEnd}
                    onKeyDown={(event) => handleResizeKeyDown(event, edge)}
                  >
                    <span
                      className={
                        edge === "left" || edge === "right"
                          ? "absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--runtime-primary)]"
                          : "absolute left-1/2 top-1/2 h-1 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--runtime-primary)]"
                      }
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] p-4 md:grid-cols-[1fr_1fr_180px]">
            <label className="grid gap-2 text-xs font-bold text-[var(--runtime-fg-muted)]">
              <span>
                {copy.cropZoom} · {Math.round(zoom * 100)}%
              </span>
              <input
                className="accent-[var(--runtime-primary)]"
                disabled={isProcessing}
                max={maximumZoom}
                min={minimumZoom}
                step={allowFreeCrop ? "any" : 0.05}
                type="range"
                value={zoom}
                onChange={(event) => setZoom(Number(event.currentTarget.value))}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-[var(--runtime-fg-muted)]">
              <span>
                {copy.cropRotation} · {rotation}°
              </span>
              <input
                className="accent-[var(--runtime-primary)]"
                disabled={isProcessing}
                max={360}
                min={0}
                step={1}
                type="range"
                value={rotation}
                onChange={(event) =>
                  setRotation(Number(event.currentTarget.value))
                }
              />
            </label>
            <div className="grid content-center gap-1 rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--runtime-fg-subtle)]">
                {allowFreeCrop ? copy.cropOutputSize : copy.cropTargetFrame}
              </span>
              <span className="text-sm font-black tabular-nums">
                {outputWidth} × {outputHeight}
              </span>
              <span className="text-[10px] font-semibold text-[var(--runtime-fg-muted)]">
                {(outputWidth / outputHeight).toFixed(3)} : 1
              </span>
            </div>
          </div>

          {!allowFreeCrop ? (
            <p className="mt-3 text-[11px] font-medium text-[var(--runtime-fg-subtle)]">
              {copy.cropTargetDescription}
              {mediaSize
                ? ` · ${Math.round(mediaSize.naturalWidth)} × ${Math.round(mediaSize.naturalHeight)}`
                : ""}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--runtime-border)] px-5 py-4 sm:px-6">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--runtime-border-strong)] bg-[var(--runtime-card-bg)] px-3 text-xs font-bold text-[var(--runtime-fg-muted)] transition hover:text-[var(--runtime-fg)]"
            type="button"
            disabled={isProcessing}
            onClick={resetView}
          >
            <RotateCcw size={14} /> {copy.cropResetView}
          </button>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg border border-[var(--runtime-border-strong)] px-4 text-xs font-bold text-[var(--runtime-fg-muted)] transition hover:bg-[var(--runtime-input-hover)] hover:text-[var(--runtime-fg)]"
              disabled={isProcessing}
              type="button"
              onClick={onCancel}
            >
              {copy.cancel}
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--runtime-primary)] px-4 text-xs font-black text-white transition hover:bg-[var(--runtime-primary-hover)] disabled:opacity-50"
              disabled={!croppedAreaPixels || isProcessing}
              type="button"
              onClick={() => void handleApply()}
            >
              <Check size={14} />
              {isProcessing ? copy.cropProcessing : copy.cropApply}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
