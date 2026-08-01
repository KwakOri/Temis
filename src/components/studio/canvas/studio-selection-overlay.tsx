"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { useCallback, useRef } from "react";

import { cn } from "@/lib/utils";
import {
  getStudioPointerRotationDeg,
  resolveStudioResizeGeometry,
  rotateStudioDelta,
  STUDIO_RESIZE_HANDLES,
  type StudioResizeGeometry,
  type StudioResizeHandle,
} from "@/utils/template-studio/transform-commands";

export interface StudioSelectionOverlayProps {
  /** 고른 것을 감싸는 사각형. 캔버스 좌표 기준이다. */
  bounds: StudioResizeGeometry;
  /** 효과를 포함한 진단용 사각형. resize handle과 저장 geometry에는 사용하지 않는다. */
  visualBounds?: StudioResizeGeometry;
  rotateDeg?: number;
  /** 캔버스 확대 비율. 손잡이는 화면에서 같은 크기로 보여야 한다. */
  scale: number;
  /**
   * 손잡이를 보여줄지.
   *
   * 여러 개를 골랐거나 잠긴 객체를 골랐을 때는 테두리만 보여준다. 잡을 수 없는
   * 손잡이를 그리면 눌러도 아무 일이 없는 표적을 만드는 셈이다.
   */
  showHandles?: boolean;
  lockAspectRatio?: boolean;
  /** 크기나 각도를 바꾸기 직전. 되돌리기 한 단위를 여기서 시작한다. */
  onTransformStart?: () => void;
  onResize?: (geometry: StudioResizeGeometry) => void;
  onRotate?: (rotateDeg: number) => void;
  onTransformEnd?: () => void;
}

const HANDLE_CURSOR: Record<StudioResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

const getHandleOffset = (
  handle: StudioResizeHandle,
): { left: string; top: string } => ({
  left: handle.includes("w") ? "0%" : handle.includes("e") ? "100%" : "50%",
  top: handle.startsWith("n") ? "0%" : handle.startsWith("s") ? "100%" : "50%",
});

/**
 * 캔버스에서 고른 것을 감싸는 선과 조작 손잡이.
 *
 * 두 편집기가 같은 overlay를 쓴다. 편집기마다 따로 만들면 손잡이 크기와 잡히는 범위가
 * 갈려서 같은 제품인데 조작감이 달라진다.
 *
 * 손잡이 위에서 시작한 끌기는 캔버스 밀기·객체 옮기기로 번지지 않게 막는다. 막지 않으면
 * 크기를 바꾸려는 동작이 자리 옮기기로 해석된다.
 */
export function StudioSelectionOverlay({
  bounds,
  visualBounds,
  rotateDeg = 0,
  scale,
  showHandles = true,
  lockAspectRatio = false,
  onTransformStart,
  onResize,
  onRotate,
  onTransformEnd,
}: StudioSelectionOverlayProps) {
  const handleSize = Math.max(6, Math.round(9 / Math.max(scale, 0.2)));
  const borderWidth = Math.max(1, 1 / Math.max(scale, 0.2));
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  const beginPointerDrag = useCallback(
    (
      event: React.PointerEvent<HTMLElement>,
      onMove: (payload: {
        deltaX: number;
        deltaY: number;
        clientX: number;
        clientY: number;
        shiftKey: boolean;
      }) => void,
    ) => {
      // 캔버스 밀기와 객체 옮기기로 번지지 않게 여기서 끊는다.
      event.preventDefault();
      event.stopPropagation();

      const startClientX = event.clientX;
      const startClientY = event.clientY;
      dragStateRef.current = {
        pointerId: event.pointerId,
        startClientX,
        startClientY,
      };
      onTransformStart?.();

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (dragStateRef.current?.pointerId !== moveEvent.pointerId) return;
        onMove({
          deltaX: moveEvent.clientX - startClientX,
          deltaY: moveEvent.clientY - startClientY,
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          shiftKey: moveEvent.shiftKey,
        });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (dragStateRef.current?.pointerId !== upEvent.pointerId) return;
        dragStateRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        onTransformEnd?.();
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [onTransformEnd, onTransformStart],
  );

  return (
    <>
      {visualBounds ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-50 border border-dashed border-[var(--accent,#4f8cff)] opacity-60"
          data-studio-visual-bounds="true"
          style={{
            left: visualBounds.left,
            top: visualBounds.top,
            width: visualBounds.width,
            height: visualBounds.height,
          }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute z-50"
        data-studio-selection-overlay="true"
        style={{
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
        }}
      >
        <div
          className="absolute inset-0 border-[var(--accent,#4f8cff)]"
          style={{ borderWidth }}
        />

        {showHandles ? (
          <>
            {STUDIO_RESIZE_HANDLES.map((handle) => {
              const offset = getHandleOffset(handle);

              return (
                <button
                  aria-label={`Resize ${handle}`}
                  className="pointer-events-auto absolute rounded-[2px] border border-[var(--accent,#4f8cff)] bg-white"
                  data-studio-resize-handle={handle}
                  key={handle}
                  style={{
                    left: offset.left,
                    top: offset.top,
                    width: handleSize,
                    height: handleSize,
                    marginLeft: -handleSize / 2,
                    marginTop: -handleSize / 2,
                    cursor: HANDLE_CURSOR[handle],
                  }}
                  type="button"
                  onPointerDown={(event) =>
                    beginPointerDrag(event, ({ deltaX, deltaY, shiftKey }) => {
                      // 회전한 객체는 화면의 오른쪽이 객체의 오른쪽이 아니다.
                      const localDelta = rotateStudioDelta({
                        deltaX: deltaX / scale,
                        deltaY: deltaY / scale,
                        rotateDeg,
                      });

                      onResize?.(
                        resolveStudioResizeGeometry({
                          start: bounds,
                          handle,
                          deltaX: localDelta.deltaX,
                          deltaY: localDelta.deltaY,
                          lockAspectRatio: lockAspectRatio || shiftKey,
                        }),
                      );
                    })
                  }
                />
              );
            })}

            <button
              aria-label="Rotate selection"
              className={cn(
                "pointer-events-auto absolute rounded-full border border-[var(--accent,#4f8cff)] bg-white",
              )}
              data-studio-rotate-handle="true"
              style={{
                left: "50%",
                top: 0,
                width: handleSize,
                height: handleSize,
                marginLeft: -handleSize / 2,
                marginTop: -(handleSize * 3),
                cursor: "grab",
              }}
              type="button"
              onPointerDown={(event) => {
                const overlayRect =
                  event.currentTarget.parentElement?.getBoundingClientRect();
                const center = overlayRect
                  ? {
                      x: overlayRect.left + overlayRect.width / 2,
                      y: overlayRect.top + overlayRect.height / 2,
                    }
                  : { x: event.clientX, y: event.clientY };

                beginPointerDrag(event, ({ clientX, clientY, shiftKey }) =>
                  onRotate?.(
                    getStudioPointerRotationDeg({
                      center,
                      pointer: { x: clientX, y: clientY },
                      snapToStep: shiftKey,
                    }),
                  ),
                );
              }}
            />
          </>
        ) : null}
      </div>
    </>
  );
}
