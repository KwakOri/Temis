"use client";

import { Check, RotateCcw, X } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Cropper, {
  type Area,
  type MediaSize,
  type Point,
} from "react-easy-crop";

import {
  fitStudioCropFrame,
  getStudioContainRect,
  resizeStudioCropFrame,
  type StudioCropFrameSize,
  type StudioCropResizeEdge,
} from "@/utils/template-studio/crop-resize";

interface StudioImageCropModalProps {
  imageSrc: string;
  initialWidth: number;
  initialHeight: number;
  onCancel: () => void;
  onApply: (croppedImageSrc: string) => void;
}

interface StudioCropResizeSession {
  edge: StudioCropResizeEdge;
  startX: number;
  startY: number;
  frameSize: StudioCropFrameSize;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
  mode: StudioCropMode;
}

type StudioCropMode = "fill" | "fit";

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

const createCroppedImage = (
  imageSrc: string,
  options: {
    mode: StudioCropMode;
    outputWidth: number;
    outputHeight: number;
    pixelCrop: Area | null;
    rotation: number;
  },
): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const workingCanvas = document.createElement("canvas");
        const workingContext = workingCanvas.getContext("2d");
        if (!workingContext) throw new Error("Canvas context is unavailable.");

        const rotated = rotateSize(image.width, image.height, options.rotation);
        workingCanvas.width = Math.ceil(rotated.width);
        workingCanvas.height = Math.ceil(rotated.height);
        workingContext.translate(
          workingCanvas.width / 2,
          workingCanvas.height / 2,
        );
        workingContext.rotate((options.rotation * Math.PI) / 180);
        workingContext.drawImage(image, -image.width / 2, -image.height / 2);

        const outputCanvas = document.createElement("canvas");
        const outputContext = outputCanvas.getContext("2d");
        if (!outputContext) throw new Error("Crop context is unavailable.");

        outputCanvas.width = clampDimension(options.outputWidth);
        outputCanvas.height = clampDimension(options.outputHeight);

        if (options.mode === "fit") {
          const containRect = getStudioContainRect(
            { width: workingCanvas.width, height: workingCanvas.height },
            { width: outputCanvas.width, height: outputCanvas.height },
          );
          outputContext.drawImage(
            workingCanvas,
            containRect.left,
            containRect.top,
            containRect.width,
            containRect.height,
          );
        } else if (options.pixelCrop) {
          outputContext.drawImage(
            workingCanvas,
            options.pixelCrop.x,
            options.pixelCrop.y,
            options.pixelCrop.width,
            options.pixelCrop.height,
            0,
            0,
            outputCanvas.width,
            outputCanvas.height,
          );
        } else {
          reject(new Error("Crop selection is unavailable."));
          return;
        }
        resolve(outputCanvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = imageSrc;
  });

export function StudioImageCropModal({
  imageSrc,
  initialWidth,
  initialHeight,
  onCancel,
  onApply,
}: StudioImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState<StudioCropMode>("fill");
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [cropWidth, setCropWidth] = useState(() =>
    clampDimension(initialWidth),
  );
  const [cropHeight, setCropHeight] = useState(() =>
    clampDimension(initialHeight),
  );
  const [outputWidth, setOutputWidth] = useState(() =>
    clampDimension(initialWidth),
  );
  const [outputHeight, setOutputHeight] = useState(() =>
    clampDimension(initialHeight),
  );
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropFrameSize, setCropFrameSize] =
    useState<StudioCropFrameSize | null>(null);
  const [resizingEdge, setResizingEdge] = useState<StudioCropResizeEdge | null>(
    null,
  );
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const stageSizeRef = useRef<StudioCropFrameSize>({ width: 0, height: 0 });
  const cropDimensionsRef = useRef({
    width: clampDimension(initialWidth),
    height: clampDimension(initialHeight),
  });
  const outputDimensionsRef = useRef({
    width: clampDimension(initialWidth),
    height: clampDimension(initialHeight),
  });
  const modeRef = useRef<StudioCropMode>("fill");
  const shouldResetToMinimumZoomRef = useRef(true);
  const resizeSessionRef = useRef<StudioCropResizeSession | null>(null);
  const readCurrentStageSize = () => {
    const stage = cropStageRef.current;
    const nextStageSize = stage
      ? { width: stage.clientWidth, height: stage.clientHeight }
      : stageSizeRef.current;

    if (nextStageSize.width > 0 && nextStageSize.height > 0) {
      stageSizeRef.current = nextStageSize;
    }

    return nextStageSize;
  };
  const aspect = useMemo(
    () => clampDimension(cropWidth) / clampDimension(cropHeight),
    [cropHeight, cropWidth],
  );
  const outputAspect = useMemo(
    () => clampDimension(outputWidth) / clampDimension(outputHeight),
    [outputHeight, outputWidth],
  );
  const activeAspect = mode === "fit" ? outputAspect : aspect;
  const minimumCropZoom = useMemo(() => {
    if (!cropFrameSize || !mediaSize || mode !== "fill") return 1;
    return Math.max(
      0.1,
      cropFrameSize.width / Math.max(1, mediaSize.width),
      cropFrameSize.height / Math.max(1, mediaSize.height),
    );
  }, [cropFrameSize, mediaSize, mode]);

  useEffect(() => {
    const nextDimensions = {
      width: clampDimension(initialWidth),
      height: clampDimension(initialHeight),
    };
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCropWidth(nextDimensions.width);
    setCropHeight(nextDimensions.height);
    cropDimensionsRef.current = nextDimensions;
    setOutputWidth(nextDimensions.width);
    setOutputHeight(nextDimensions.height);
    outputDimensionsRef.current = nextDimensions;
    setMode("fill");
    modeRef.current = "fill";
    shouldResetToMinimumZoomRef.current = true;
    setMediaSize(null);
    setCroppedAreaPixels(null);
    setResizingEdge(null);
    resizeSessionRef.current = null;

    const currentStageSize = readCurrentStageSize();
    if (currentStageSize.width > 0 && currentStageSize.height > 0) {
      setCropFrameSize(
        fitStudioCropFrame(
          currentStageSize,
          nextDimensions.width / nextDimensions.height,
        ),
      );
    }
  }, [imageSrc, initialHeight, initialWidth]);

  useEffect(() => {
    if (mode !== "fill" || !mediaSize || !cropFrameSize) return;

    if (shouldResetToMinimumZoomRef.current) {
      shouldResetToMinimumZoomRef.current = false;
      setZoom(minimumCropZoom);
      return;
    }

    if (zoom < minimumCropZoom) setZoom(minimumCropZoom);
  }, [cropFrameSize, mediaSize, minimumCropZoom, mode, zoom]);

  useEffect(() => {
    const stage = cropStageRef.current;
    if (!stage) return;

    const updateStageSize = () => {
      const nextStageSize = readCurrentStageSize();
      if (nextStageSize.width <= 0 || nextStageSize.height <= 0) return;

      stageSizeRef.current = nextStageSize;
      const dimensions =
        modeRef.current === "fit"
          ? outputDimensionsRef.current
          : cropDimensionsRef.current;
      setCropFrameSize(
        fitStudioCropFrame(nextStageSize, dimensions.width / dimensions.height),
      );
    };

    updateStageSize();
    const resizeObserver = new ResizeObserver(updateStageSize);
    resizeObserver.observe(stage);
    return () => resizeObserver.disconnect();
  }, []);

  const updateOutputDimensions = (nextWidth: number, nextHeight: number) => {
    const dimensions = {
      width: clampDimension(nextWidth),
      height: clampDimension(nextHeight),
    };
    outputDimensionsRef.current = dimensions;
    setOutputWidth(dimensions.width);
    setOutputHeight(dimensions.height);
    if (modeRef.current === "fill") {
      cropDimensionsRef.current = dimensions;
      setCropWidth(dimensions.width);
      setCropHeight(dimensions.height);
    }

    const currentStageSize = readCurrentStageSize();
    if (currentStageSize.width > 0 && currentStageSize.height > 0) {
      setCropFrameSize(
        fitStudioCropFrame(
          currentStageSize,
          dimensions.width / dimensions.height,
        ),
      );
    }
  };

  const changeMode = (nextMode: StudioCropMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
    setCrop({ x: 0, y: 0 });
    shouldResetToMinimumZoomRef.current = nextMode === "fill";
    setZoom(1);
    const dimensions =
      nextMode === "fit"
        ? outputDimensionsRef.current
        : cropDimensionsRef.current;

    const currentStageSize = readCurrentStageSize();
    if (currentStageSize.width > 0 && currentStageSize.height > 0) {
      setCropFrameSize(
        fitStudioCropFrame(
          currentStageSize,
          dimensions.width / dimensions.height,
        ),
      );
    }
  };

  const useFullImage = () => {
    if (!mediaSize) return;
    const originalDimensions = {
      width: clampDimension(mediaSize.naturalWidth),
      height: clampDimension(mediaSize.naturalHeight),
    };
    cropDimensionsRef.current = originalDimensions;
    outputDimensionsRef.current = originalDimensions;
    setCropWidth(originalDimensions.width);
    setCropHeight(originalDimensions.height);
    setOutputWidth(originalDimensions.width);
    setOutputHeight(originalDimensions.height);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    shouldResetToMinimumZoomRef.current = true;
    modeRef.current = "fill";
    setMode("fill");

    const currentStageSize = readCurrentStageSize();
    if (currentStageSize.width > 0 && currentStageSize.height > 0) {
      setCropFrameSize(
        fitStudioCropFrame(
          currentStageSize,
          originalDimensions.width / originalDimensions.height,
        ),
      );
    }
  };

  const handleResizeStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    edge: StudioCropResizeEdge,
  ) => {
    if (!cropFrameSize) return;
    readCurrentStageSize();
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeSessionRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      frameSize: cropFrameSize,
      cropWidth,
      cropHeight,
      outputWidth,
      outputHeight,
      mode,
    };
    setResizingEdge(edge);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = resizeSessionRef.current;
    if (!session) return;
    event.preventDefault();
    event.stopPropagation();

    const pointerDelta =
      session.edge === "right"
        ? event.clientX - session.startX
        : session.edge === "left"
          ? session.startX - event.clientX
          : session.edge === "bottom"
            ? event.clientY - session.startY
            : session.startY - event.clientY;
    const nextFrameSize = resizeStudioCropFrame(
      session.frameSize,
      stageSizeRef.current,
      session.edge,
      pointerDelta,
    );
    const nextAspect = nextFrameSize.width / nextFrameSize.height;
    const resizesWidth = session.edge === "left" || session.edge === "right";
    const nextDimensions =
      session.mode === "fit"
        ? resizesWidth
          ? {
              width: clampDimension(session.outputHeight * nextAspect),
              height: session.outputHeight,
            }
          : {
              width: session.outputWidth,
              height: clampDimension(session.outputWidth / nextAspect),
            }
        : resizesWidth
          ? {
              width: clampDimension(session.cropHeight * nextAspect),
              height: session.cropHeight,
            }
          : {
              width: session.cropWidth,
              height: clampDimension(session.cropWidth / nextAspect),
            };

    if (session.mode === "fit") {
      outputDimensionsRef.current = nextDimensions;
      setOutputWidth(nextDimensions.width);
      setOutputHeight(nextDimensions.height);
    } else {
      cropDimensionsRef.current = nextDimensions;
      outputDimensionsRef.current = nextDimensions;
      setCropWidth(nextDimensions.width);
      setCropHeight(nextDimensions.height);
      setOutputWidth(nextDimensions.width);
      setOutputHeight(nextDimensions.height);
    }
    setCropFrameSize(nextFrameSize);
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeSessionRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeSessionRef.current = null;
    setResizingEdge(null);
  };

  const resetTransform = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(mode === "fill" ? minimumCropZoom : 1);
    setRotation(0);
  };

  const handleApply = useCallback(async () => {
    if ((mode === "fill" && !croppedAreaPixels) || isProcessing) return;
    setIsProcessing(true);
    try {
      onApply(
        await createCroppedImage(imageSrc, {
          mode,
          outputWidth,
          outputHeight,
          pixelCrop: croppedAreaPixels,
          rotation,
        }),
      );
    } catch (error) {
      console.error("Template Studio image crop failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    croppedAreaPixels,
    imageSrc,
    isProcessing,
    mode,
    onApply,
    outputHeight,
    outputWidth,
    rotation,
  ]);

  const selectedPixelSize =
    mode === "fit" && mediaSize
      ? {
          width: Math.round(mediaSize.naturalWidth),
          height: Math.round(mediaSize.naturalHeight),
        }
      : croppedAreaPixels
        ? {
            width: Math.round(croppedAreaPixels.width),
            height: Math.round(croppedAreaPixels.height),
          }
        : null;
  const isUpscaling = Boolean(
    selectedPixelSize &&
    (outputWidth > selectedPixelSize.width ||
      outputHeight > selectedPixelSize.height),
  );
  const fitPreviewStyle = useMemo<React.CSSProperties>(() => {
    if (!cropFrameSize || !mediaSize) return {};
    const baseScale = Math.min(
      cropFrameSize.width / mediaSize.naturalWidth,
      cropFrameSize.height / mediaSize.naturalHeight,
    );
    const baseWidth = mediaSize.naturalWidth * baseScale;
    const baseHeight = mediaSize.naturalHeight * baseScale;
    const rotated = rotateSize(baseWidth, baseHeight, rotation);
    const rotationScale = Math.min(
      cropFrameSize.width / rotated.width,
      cropFrameSize.height / rotated.height,
      1,
    );

    return {
      width: baseWidth,
      height: baseHeight,
      left: "50%",
      top: "50%",
      transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${rotationScale})`,
    };
  }, [cropFrameSize, mediaSize, rotation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void handleApply();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApply, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="flex max-h-[calc(100vh-72px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-base font-black text-[var(--fg)]">
              Crop image
            </h2>
            <p className="mt-0.5 text-xs font-medium text-[var(--fg2)]">
              Crop selection and output resolution are configured separately.
            </p>
          </div>
          <button
            aria-label="Close crop dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            type="button"
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-6">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--field-border)] bg-[var(--field)] p-1">
            <button
              aria-pressed={mode === "fill"}
              className={`rounded-lg px-3 py-2 text-left transition ${
                mode === "fill"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              }`}
              type="button"
              onClick={() => changeMode("fill")}
            >
              <span className="block text-xs font-black">Fill / Crop</span>
              <span className="mt-0.5 block text-[10px] font-semibold opacity-75">
                Fill the frame without empty space
              </span>
            </button>
            <button
              aria-pressed={mode === "fit"}
              className={`rounded-lg px-3 py-2 text-left transition ${
                mode === "fit"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              }`}
              type="button"
              onClick={() => changeMode("fit")}
            >
              <span className="block text-xs font-black">Fit / Contain</span>
              <span className="mt-0.5 block text-[10px] font-semibold opacity-75">
                Keep the whole image with transparent padding
              </span>
            </button>
          </div>
          <div
            className={`relative h-[min(52vh,520px)] min-h-72 overflow-hidden rounded-xl border border-[var(--field-border)] bg-[var(--canvas)] ${
              resizingEdge
                ? "[&_.reactEasyCrop_Container]:pointer-events-none"
                : ""
            }`}
            ref={cropStageRef}
          >
            {mode === "fill" ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                cropSize={cropFrameSize ?? undefined}
                minZoom={minimumCropZoom}
                rotation={rotation}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onMediaLoaded={setMediaSize}
                onRotationChange={setRotation}
                onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
                onZoomChange={setZoom}
              />
            ) : null}
            {cropFrameSize ? (
              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 ${
                  mode === "fit" ? "border border-white/50" : ""
                }`}
                style={{
                  width: cropFrameSize.width,
                  height: cropFrameSize.height,
                }}
              >
                {mode === "fit" ? (
                  <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(45deg,rgba(255,255,255,0.04)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.04)_75%),linear-gradient(45deg,rgba(255,255,255,0.04)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.04)_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Local crop previews use an in-memory user-selected image URL. */}
                    <img
                      alt="Fit preview"
                      className="pointer-events-none absolute max-w-none select-none"
                      draggable={false}
                      src={imageSrc}
                      style={fitPreviewStyle}
                      onLoad={(event) => {
                        const image = event.currentTarget;
                        setMediaSize({
                          width: image.clientWidth,
                          height: image.clientHeight,
                          naturalWidth: image.naturalWidth,
                          naturalHeight: image.naturalHeight,
                        });
                      }}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/40" />
                    <div className="pointer-events-none absolute inset-y-0 right-1/3 w-px bg-white/40" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/40" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-1/3 h-px bg-white/40" />
                  </div>
                ) : null}
                {(["left", "right", "top", "bottom"] as const).map((edge) => {
                  const isHorizontal = edge === "left" || edge === "right";
                  const edgePosition =
                    edge === "left"
                      ? "-left-3 top-0 h-full w-6 cursor-ew-resize"
                      : edge === "right"
                        ? "-right-3 top-0 h-full w-6 cursor-ew-resize"
                        : edge === "top"
                          ? "-top-3 left-0 h-6 w-full cursor-ns-resize"
                          : "-bottom-3 left-0 h-6 w-full cursor-ns-resize";
                  const gripPosition = isHorizontal
                    ? "left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2"
                    : "left-1/2 top-1/2 h-1 w-14 -translate-x-1/2 -translate-y-1/2";

                  return (
                    <button
                      aria-label={`Resize ${edge} crop edge`}
                      className={`group pointer-events-auto absolute touch-none bg-transparent outline-none ${edgePosition}`}
                      key={edge}
                      type="button"
                      onLostPointerCapture={handleResizeEnd}
                      onPointerCancel={handleResizeEnd}
                      onPointerDown={(event) => handleResizeStart(event, edge)}
                      onPointerMove={handleResizeMove}
                      onPointerUp={handleResizeEnd}
                    >
                      <span
                        className={`absolute rounded-full bg-[var(--accent)] shadow-[0_0_0_2px_rgba(15,23,42,0.75)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${gripPosition} ${
                          resizingEdge === edge ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 rounded-xl border border-[var(--field-border)] bg-[var(--field)] p-4 lg:grid-cols-[1fr_1fr_180px]">
            <label className="grid gap-2 text-xs font-bold text-[var(--fg2)]">
              <span>Zoom · {Math.round(zoom * 100)}%</span>
              <input
                className="accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={mode === "fit"}
                max={3}
                min={mode === "fill" ? minimumCropZoom : 1}
                step={0.05}
                type="range"
                value={zoom}
                onChange={(event) => setZoom(Number(event.currentTarget.value))}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-[var(--fg2)]">
              <span>Rotation · {rotation}°</span>
              <input
                className="accent-[var(--accent)]"
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
            <div className="grid content-center gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--panel)] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                Frame ratio
              </span>
              <span className="text-sm font-black text-[var(--fg)]">
                {activeAspect.toFixed(3)} : 1
              </span>
              <span className="text-[10px] font-semibold text-[var(--fg3)]">
                Drag an edge to change
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.35fr]">
            <div className="grid gap-1 rounded-xl border border-[var(--field-border)] bg-[var(--field)] p-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                Original
              </span>
              <span className="text-sm font-black text-[var(--fg)]">
                {mediaSize
                  ? `${Math.round(mediaSize.naturalWidth)} × ${Math.round(mediaSize.naturalHeight)}`
                  : "Loading…"}
              </span>
              <span className="text-[10px] font-semibold text-[var(--fg3)]">
                Source image pixels
              </span>
            </div>
            <div className="grid gap-1 rounded-xl border border-[var(--field-border)] bg-[var(--field)] p-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                {mode === "fit" ? "Full image" : "Selection"}
              </span>
              <span className="text-sm font-black text-[var(--fg)]">
                {selectedPixelSize
                  ? `${selectedPixelSize.width} × ${selectedPixelSize.height}`
                  : "Calculating…"}
              </span>
              <span className="text-[10px] font-semibold text-[var(--fg3)]">
                {mode === "fit"
                  ? "Entire source is preserved"
                  : "Actual selected source pixels"}
              </span>
            </div>
            <div className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                  Output resolution
                </span>
                {isUpscaling ? (
                  <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-amber-300">
                    Upscaling
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  aria-label="Output width"
                  className="h-9 min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  min={1}
                  type="number"
                  value={outputWidth}
                  onChange={(event) =>
                    updateOutputDimensions(
                      Number(event.currentTarget.value),
                      outputDimensionsRef.current.height,
                    )
                  }
                />
                <span className="text-xs font-black text-[var(--fg3)]">×</span>
                <input
                  aria-label="Output height"
                  className="h-9 min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  min={1}
                  type="number"
                  value={outputHeight}
                  onChange={(event) =>
                    updateOutputDimensions(
                      outputDimensionsRef.current.width,
                      Number(event.currentTarget.value),
                    )
                  }
                />
              </div>
              <span className="text-[10px] font-semibold text-[var(--fg3)]">
                Final PNG size; its ratio also controls the frame
              </span>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
          <div className="flex gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-bold text-[var(--fg2)] transition hover:text-[var(--fg)]"
              type="button"
              onClick={resetTransform}
            >
              <RotateCcw size={14} /> Reset view
            </button>
            <button
              className="h-9 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-bold text-[var(--fg2)] transition hover:text-[var(--fg)] disabled:opacity-40"
              disabled={!mediaSize}
              type="button"
              onClick={useFullImage}
            >
              Use full image
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg border border-[var(--field-border)] px-4 text-xs font-bold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              disabled={isProcessing}
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-xs font-black text-white transition hover:brightness-110 disabled:opacity-50"
              disabled={(mode === "fill" && !croppedAreaPixels) || isProcessing}
              type="button"
              onClick={() => void handleApply()}
            >
              <Check size={14} /> {isProcessing ? "Processing…" : "Apply crop"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
