"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import type { StudioTemplateDocument } from "@/types/template-studio";
import { StudioSelectionOverlay } from "@/components/studio/canvas/studio-selection-overlay";
import { isSameThumbnailImageTransform } from "@/utils/thumbnail-studio/image-placement-history";
import { getStudioImageInputPolicy } from "@/utils/thumbnail-studio/image-input-policy";
import {
  formatStudioImageObjectPosition,
  getStudioImageObjectPosition,
} from "@/utils/thumbnail-studio/image-object-position";
import {
  fromRuntimeImageTransform,
  getRuntimeImageFitGeometry,
  getThumbnailRuntimeImageNodes,
  toRuntimeImageTransform,
  type StudioRuntimeImageOverride,
  type StudioRuntimeImageTransform,
} from "@/utils/thumbnail-studio/runtime-image-transform";

/** Recover the local-to-screen matrix from actual layout, including fillParent and ancestor transforms. */
const getElementScreenMatrix = (element: HTMLElement) => {
  let linear = new DOMMatrix();
  let current: HTMLElement | null = element;
  while (current) {
    const transform = getComputedStyle(current).transform;
    if (transform !== "none") {
      const matrix = new DOMMatrix(transform);
      matrix.e = 0;
      matrix.f = 0;
      linear = matrix.multiply(linear);
    }
    current = current.parentElement;
  }
  const corners = [
    [0, 0],
    [element.offsetWidth, 0],
    [0, element.offsetHeight],
    [element.offsetWidth, element.offsetHeight],
  ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(linear));
  const rect = element.getBoundingClientRect();
  linear.e = rect.left - Math.min(...corners.map((point) => point.x));
  linear.f = rect.top - Math.min(...corners.map((point) => point.y));
  return linear;
};

interface Measurement {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  matrix: DOMMatrix;
  screenMatrix: DOMMatrix;
}

interface Props {
  document: StudioTemplateDocument;
  inputId: string;
  nodeId: string;
  imageSrc: string;
  exportRootRef: React.RefObject<HTMLDivElement | null>;
  viewportTransform: { x: number; y: number; scale: number };
  override?: StudioRuntimeImageOverride;
  onChange: (transform: StudioRuntimeImageTransform) => void;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
  onTransformCancel?: () => void;
}

export function StudioRuntimeImageTransformOverlay({
  document,
  inputId,
  nodeId,
  imageSrc,
  exportRootRef,
  viewportTransform,
  override,
  onChange,
  onTransformStart,
  onTransformEnd,
  onTransformCancel,
}: Props) {
  const gesture = useRef<{
    before: StudioRuntimeImageTransform;
    latest: StudioRuntimeImageTransform;
  } | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const node = getThumbnailRuntimeImageNodes(document, inputId).find(
    (candidate) => candidate.id === nodeId,
  );
  const input = document.inputs[inputId];
  const policy = getStudioImageInputPolicy(
    input?.type === "image" ? input.policy : undefined,
  );

  useLayoutEffect(() => {
    const root = exportRootRef.current;
    const content = root?.parentElement;
    const slot = Array.from(
      root?.querySelectorAll<HTMLElement>("[data-studio-image-slot]") ?? [],
    ).find((element) => element.dataset.studioImageSlot === nodeId);
    const image = slot?.querySelector("img");
    setMeasurement(null);
    if (!slot || !image || !content) return;
    const measure = () => {
      if (
        !image.complete ||
        !image.naturalWidth ||
        !slot.offsetWidth ||
        !slot.offsetHeight
      ) {
        setMeasurement(null);
        return;
      }
      const screenMatrix = getElementScreenMatrix(slot);
      if (
        Math.abs(
          screenMatrix.a * screenMatrix.d - screenMatrix.b * screenMatrix.c,
        ) < 1e-8
      )
        return;
      setMeasurement({
        width: slot.offsetWidth,
        height: slot.offsetHeight,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        matrix: getElementScreenMatrix(content)
          .inverse()
          .multiply(screenMatrix),
        screenMatrix,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    observer.observe(content);
    image.addEventListener("load", measure);
    image.addEventListener("error", measure);
    return () => {
      observer.disconnect();
      image.removeEventListener("load", measure);
      image.removeEventListener("error", measure);
    };
  }, [document, nodeId, imageSrc, exportRootRef, viewportTransform]);

  if (
    !measurement ||
    !node ||
    input?.type !== "image" ||
    (!policy.allowFitChange && !policy.allowFocusChange)
  )
    return null;
  const transform = override?.transforms?.[nodeId];
  const geometry = transform
    ? fromRuntimeImageTransform(transform, measurement)
    : getRuntimeImageFitGeometry({
        ...measurement,
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
  const rotateDeg = transform?.rotateDeg ?? 0;
  const matrix = measurement.matrix;
  const inverse = measurement.screenMatrix.inverse();
  const emitTransform = (next: StudioRuntimeImageTransform) => {
    const previous =
      gesture.current?.latest ??
      toRuntimeImageTransform(geometry, measurement, rotateDeg);
    if (isSameThumbnailImageTransform(previous, next)) return;
    if (gesture.current) gesture.current.latest = next;
    onChange(next);
  };
  const updateGeometry = (next: typeof geometry) =>
    emitTransform(
      toRuntimeImageTransform(
        policy.allowFocusChange
          ? next
          : {
              ...next,
              left: geometry.left + (geometry.width - next.width) / 2,
              top: geometry.top + (geometry.height - next.height) / 2,
            },
        measurement,
        rotateDeg,
      ),
    );

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-50 origin-top-left"
      data-studio-runtime-image-adjustment={nodeId}
      style={{
        width: measurement.width,
        height: measurement.height,
        transform: `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`,
      }}
    >
      <StudioSelectionOverlay
        bounds={geometry}
        rotateDeg={rotateDeg}
        scale={Math.hypot(
          measurement.screenMatrix.a,
          measurement.screenMatrix.b,
        )}
        lockAspectRatio
        handleTargetSize={28}
        allowResize={policy.allowFitChange}
        allowRotate={policy.allowFitChange && policy.allowFocusChange}
        pointerDeltaToLocal={({ deltaX, deltaY }) => ({
          deltaX: inverse.a * deltaX + inverse.c * deltaY,
          deltaY: inverse.b * deltaX + inverse.d * deltaY,
        })}
        onMove={policy.allowFocusChange ? updateGeometry : undefined}
        onTransformStart={() => {
          const before = toRuntimeImageTransform(
            geometry,
            measurement,
            rotateDeg,
          );
          gesture.current = { before, latest: before };
          onTransformStart?.();
        }}
        onTransformEnd={() => {
          const current = gesture.current;
          gesture.current = null;
          if (
            current &&
            isSameThumbnailImageTransform(current.before, current.latest) &&
            onTransformCancel
          )
            onTransformCancel();
          else onTransformEnd?.();
        }}
        onTransformCancel={
          onTransformCancel
            ? () => {
                gesture.current = null;
                onTransformCancel();
              }
            : undefined
        }
        onResize={updateGeometry}
        onRotate={(angle) =>
          emitTransform(toRuntimeImageTransform(geometry, measurement, angle))
        }
      />
    </div>
  );
}
