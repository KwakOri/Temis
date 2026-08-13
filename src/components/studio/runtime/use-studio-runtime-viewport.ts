"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export const STUDIO_RUNTIME_MIN_SCALE = 0.1;
export const STUDIO_RUNTIME_MAX_SCALE = 2;
const ZOOM_STEP = 0.1;

export interface StudioRuntimePreviewSize {
  width: number;
  height: number;
}

export interface StudioRuntimeViewportTransform {
  scale: number;
  x: number;
  y: number;
}

export interface StudioRuntimeViewport {
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  viewportTransform: StudioRuntimeViewportTransform;
  isPanning: boolean;
  fitToViewport: () => void;
  updateScale: (
    nextScale: number,
    anchor?: { clientX: number; clientY: number },
  ) => void;
  handleViewportWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  stopPanning: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const clampScale = (scale: number) =>
  Math.min(STUDIO_RUNTIME_MAX_SCALE, Math.max(STUDIO_RUNTIME_MIN_SCALE, scale));

export function useStudioRuntimeViewport(
  previewSize: StudioRuntimePreviewSize,
): StudioRuntimeViewport {
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewportTransform, setViewportTransform] =
    useState<StudioRuntimeViewportTransform>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const fitToViewport = useCallback(() => {
    const element = previewContainerRef.current;
    if (!element) return;

    const availableWidth = Math.max(1, element.clientWidth - 64);
    const availableHeight = Math.max(1, element.clientHeight - 64);
    const fitScale = clampScale(
      Math.min(
        1,
        availableWidth / Math.max(1, previewSize.width),
        availableHeight / Math.max(1, previewSize.height),
      ),
    );

    setViewportTransform({ scale: Number(fitScale.toFixed(3)), x: 0, y: 0 });
  }, [previewSize.height, previewSize.width]);

  const updateScale = useCallback(
    (nextScale: number, anchor?: { clientX: number; clientY: number }) => {
      const element = previewContainerRef.current;
      const clampedScale = Number(clampScale(nextScale).toFixed(2));

      setViewportTransform((currentTransform) => {
        if (!element || !anchor || currentTransform.scale === clampedScale) {
          return { ...currentTransform, scale: clampedScale };
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

  useEffect(() => {
    const element = previewContainerRef.current;
    if (!element) return;

    if (typeof ResizeObserver === "undefined") {
      fitToViewport();
      return;
    }

    const observer = new ResizeObserver(() => fitToViewport());
    observer.observe(element);
    fitToViewport();
    return () => observer.disconnect();
  }, [fitToViewport]);

  const handleViewportWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      const multiplier = event.shiftKey ? 2 : 1;
      updateScale(
        viewportTransform.scale + direction * ZOOM_STEP * multiplier,
        { clientX: event.clientX, clientY: event.clientY },
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

  return {
    previewContainerRef,
    viewportTransform,
    isPanning,
    fitToViewport,
    updateScale,
    handleViewportWheel,
    handlePointerDown,
    handlePointerMove,
    stopPanning,
  };
}
