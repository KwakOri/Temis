"use client";

import { useGesture } from "@use-gesture/react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getStudioVisibleCanvasCenter,
  type StudioCanvasPoint,
} from "@/utils/template-studio/canvas-viewport-geometry";

const STUDIO_PREVIEW_SCALE_MIN = 0.1;
const STUDIO_PREVIEW_SCALE_MAX = 2;

export const clampStudioPreviewScale = (value: number) =>
  Math.min(Math.max(value, STUDIO_PREVIEW_SCALE_MIN), STUDIO_PREVIEW_SCALE_MAX);

export const getStudioWheelZoomScale = ({
  currentScale,
  deltaY,
  deltaMode,
  viewportHeight,
}: {
  currentScale: number;
  deltaY: number;
  deltaMode: number;
  viewportHeight: number;
}) => {
  const deltaMultiplier =
    deltaMode === 1 ? 16 : deltaMode === 2 ? Math.max(1, viewportHeight) : 1;
  const normalizedDelta = deltaY * deltaMultiplier;
  const zoomDelta = Math.max(-0.1, Math.min(0.1, normalizedDelta * -0.001));

  return clampStudioPreviewScale(Number((currentScale + zoomDelta).toFixed(3)));
};

type StudioViewportDragMemo =
  | {
      mode: "pan";
      startX: number;
      startY: number;
    }
  | {
      mode: "object";
      nodeId: string;
      lastX: number;
      lastY: number;
      lockAxis: "x" | "y" | null;
    }
  | null;

export interface StudioCanvasViewportHandle {
  /**
   * 지금 화면에 보이는 캔버스 좌표의 중앙.
   *
   * 새 객체를 지금 보고 있는 자리에 놓기 위해 쓴다. 확대와 밀기는 뷰포트가 갖고 있어서
   * 밖에서는 계산할 수 없다. 값을 구독하지 않고 필요할 때 읽는다. 밀 때마다 알리면
   * 끌고 있는 동안 편집기 전체가 다시 그려진다.
   */
  getVisibleCanvasCenter: () => StudioCanvasPoint;
}

interface StudioCanvasViewportProps {
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  fitRequestKey: number;
  /** 뷰포트만 아는 값을 밖에서 읽을 통로 */
  handleRef?: React.MutableRefObject<StudioCanvasViewportHandle | null>;
  onScaleChange: React.Dispatch<React.SetStateAction<number>>;
  onMoveNode?: (
    nodeId: string,
    delta: { deltaX: number; deltaY: number },
  ) => void;
  onMoveNodeStart?: (nodeId: string) => boolean | void;
  onOpenNodePicker?: (payload: {
    clientX: number;
    clientY: number;
    nodeIds: string[];
  }) => void;
  resolveDragNodeId?: (payload: {
    targetNodeId: string | null;
    targetNodeIds: string[];
    nodeIdsAtPoint: string[];
  }) => string | null;
  onSelectNode?: (nodeId: string) => void;
  children: React.ReactNode;
}

const getNodeIdFromEventTarget = (
  target: EventTarget | null,
): string | null => {
  if (!(target instanceof Element)) return null;
  return target.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
};

const getNodeIdPathFromEventTarget = (
  target: EventTarget | null,
  root: Element | null,
): string[] => {
  if (!(target instanceof Element) || !root) return [];

  const nodeIds: string[] = [];
  let element: Element | null = target;

  while (element && root.contains(element)) {
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId && !nodeIds.includes(nodeId)) {
      nodeIds.push(nodeId);
    }
    element = element.parentElement;
  }

  return nodeIds;
};

export function StudioCanvasViewport({
  canvasWidth,
  canvasHeight,
  scale,
  fitRequestKey,
  handleRef,
  onScaleChange,
  onMoveNode,
  onMoveNodeStart,
  onOpenNodePicker,
  resolveDragNodeId,
  onSelectNode,
  children,
}: StudioCanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const isSpacePressedRef = useRef(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const availableWidth = Math.max(240, viewport.clientWidth - 160);
    const availableHeight = Math.max(200, viewport.clientHeight - 160);
    const fitScale = clampStudioPreviewScale(
      Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight),
    );

    onScaleChange(Number(fitScale.toFixed(2)));
    setPosition({ x: 0, y: 0 });
  }, [canvasHeight, canvasWidth, onScaleChange]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(fitToViewport);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [fitRequestKey, fitToViewport]);

  const getVisibleCanvasCenter = useCallback((): StudioCanvasPoint => {
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    const canvasRect = canvasRootRef.current?.getBoundingClientRect();

    if (!viewportRect || !canvasRect) {
      return { x: canvasWidth / 2, y: canvasHeight / 2 };
    }

    return getStudioVisibleCanvasCenter({
      viewportRect,
      canvasRect,
      canvasWidth,
      canvasHeight,
      scale,
    });
  }, [canvasHeight, canvasWidth, scale]);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = { getVisibleCanvasCenter };
    return () => {
      handleRef.current = null;
    };
  }, [getVisibleCanvasCenter, handleRef]);

  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateMobileState();
    window.addEventListener("resize", updateMobileState);
    return () => window.removeEventListener("resize", updateMobileState);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheelZoom = (event: WheelEvent) => {
      if (!event.altKey || event.deltaY === 0) return;

      event.preventDefault();
      event.stopPropagation();

      onScaleChange((currentScale) =>
        getStudioWheelZoomScale({
          currentScale,
          deltaY: event.deltaY,
          deltaMode: event.deltaMode,
          viewportHeight: viewport.clientHeight,
        }),
      );
    };

    viewport.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheelZoom);
  }, [onScaleChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditingTarget =
        target instanceof HTMLElement &&
        Boolean(
          target.closest(
            "input, textarea, select, button, [contenteditable='true']",
          ),
        );

      if (event.code !== "Space" || isEditingTarget) return;
      event.preventDefault();
      isSpacePressedRef.current = true;
      setIsSpacePressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
      setIsDragging(false);
    };

    const handleBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
      setIsDragging(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const getNodeIdsAtPoint = useCallback((clientX: number, clientY: number) => {
    const canvasRoot = canvasRootRef.current;
    if (!canvasRoot) return [];

    const seen = new Set<string>();
    const nodeIds: string[] = [];

    document.elementsFromPoint(clientX, clientY).forEach((element) => {
      if (!(element instanceof Element)) return;
      const nodeElement = element.closest("[data-node-id]");
      if (!nodeElement || !canvasRoot.contains(nodeElement)) return;

      const nodeId = nodeElement.getAttribute("data-node-id");
      if (!nodeId || seen.has(nodeId)) return;

      seen.add(nodeId);
      nodeIds.push(nodeId);
    });

    return nodeIds;
  }, []);

  const bind = useGesture(
    {
      onDrag: ({ event, movement: [mx, my], first, last, memo, touches }) => {
        if (touches > 1) return memo;

        if (first) {
          const targetNodeIds = getNodeIdPathFromEventTarget(
            event.target,
            canvasRootRef.current,
          );
          const targetNodeId =
            targetNodeIds[0] ?? getNodeIdFromEventTarget(event.target);
          const nodeIdsAtPoint =
            "clientX" in event && "clientY" in event
              ? getNodeIdsAtPoint(Number(event.clientX), Number(event.clientY))
              : targetNodeIds;
          const nodeId = resolveDragNodeId
            ? resolveDragNodeId({
                targetNodeId,
                targetNodeIds,
                nodeIdsAtPoint,
              })
            : targetNodeId;
          const shouldPan = isSpacePressedRef.current || (isMobile && !nodeId);

          if (shouldPan) {
            setIsDragging(true);
            memo = {
              mode: "pan",
              startX: position.x,
              startY: position.y,
            } satisfies StudioViewportDragMemo;
          } else if (nodeId && onMoveNode) {
            onSelectNode?.(nodeId);
            if (onMoveNodeStart?.(nodeId) === false) return null;

            setIsDragging(true);
            memo = {
              mode: "object",
              nodeId,
              lastX: 0,
              lastY: 0,
              lockAxis: null,
            } satisfies StudioViewportDragMemo;
          } else {
            return null;
          }
        }

        if (!memo) return memo;

        const dragMemo = memo as StudioViewportDragMemo;
        if (dragMemo?.mode === "pan") {
          setPosition({
            x: dragMemo.startX + mx,
            y: dragMemo.startY + my,
          });
        }

        if (dragMemo?.mode === "object") {
          const isShiftPressed = "shiftKey" in event && Boolean(event.shiftKey);
          let lockAxis = dragMemo.lockAxis;

          if (isShiftPressed && !lockAxis) {
            const absoluteX = Math.abs(mx);
            const absoluteY = Math.abs(my);
            if (Math.max(absoluteX, absoluteY) > 2) {
              lockAxis = absoluteX >= absoluteY ? "x" : "y";
            }
          }

          if (!isShiftPressed) {
            lockAxis = null;
          }

          let deltaX = (mx - dragMemo.lastX) / scale;
          let deltaY = (my - dragMemo.lastY) / scale;

          if (lockAxis === "x") {
            deltaY = 0;
          }

          if (lockAxis === "y") {
            deltaX = 0;
          }

          if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
            onMoveNode?.(dragMemo.nodeId, { deltaX, deltaY });
          }

          memo = {
            ...dragMemo,
            lastX: mx,
            lastY: my,
            lockAxis,
          } satisfies StudioViewportDragMemo;
        }

        if (last) setIsDragging(false);
        return memo;
      },
      onPinch: ({ offset: [scaleOffset], first, memo, touches }) => {
        if (!isMobile || touches < 2) return memo;

        if (first || !memo) {
          memo = scale;
        }

        if (Math.abs(scaleOffset) > 0.001) {
          onScaleChange(
            clampStudioPreviewScale(
              Number((memo + scaleOffset * 0.01).toFixed(2)),
            ),
          );
        }

        return memo;
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 1,
        pointer: { touch: true },
      },
      pinch: {
        scaleBounds: {
          min: STUDIO_PREVIEW_SCALE_MIN,
          max: STUDIO_PREVIEW_SCALE_MAX,
        },
        rubberband: true,
        threshold: 0.1,
        pointer: { touch: true },
      },
    },
  );

  const isPannable = isSpacePressed || isMobile;
  const containerWidth = canvasWidth * scale;
  const containerHeight = canvasHeight * scale;

  const matteStyle = useMemo(
    () => ({
      backgroundColor: "var(--canvas)",
      backgroundImage:
        "linear-gradient(45deg, var(--check) 25%, transparent 25%), linear-gradient(-45deg, var(--check) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--check) 75%), linear-gradient(-45deg, transparent 75%, var(--check) 75%)",
      backgroundSize: "22px 22px",
      backgroundPosition: "0 0, 0 11px, 11px -11px, -11px 0",
    }),
    [],
  );

  const draggableStyle = useMemo(
    () => ({
      width: containerWidth,
      height: containerHeight,
      transform: `translate(${position.x}px, ${position.y}px)`,
      cursor: isPannable ? (isDragging ? "grabbing" : "grab") : "default",
      transition: "width 0.1s ease, height 0.1s ease",
      touchAction: "none" as const,
    }),
    [
      containerHeight,
      containerWidth,
      isDragging,
      isPannable,
      position.x,
      position.y,
    ],
  );

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      ref={viewportRef}
      style={matteStyle}
    >
      <button
        aria-label="Previous canvas"
        className="absolute left-5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-lg text-[var(--fg2)] shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition hover:text-[var(--fg)]"
        type="button"
      >
        ‹
      </button>
      <button
        aria-label="Next canvas"
        className="absolute right-5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-lg text-[var(--fg2)] shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition hover:text-[var(--fg)]"
        type="button"
      >
        ›
      </button>
      <div
        className="relative"
        data-studio-preview-canvas-root="true"
        data-studio-pan-state={
          isSpacePressed ? (isDragging ? "dragging" : "ready") : undefined
        }
        ref={canvasRootRef}
        style={draggableStyle}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenNodePicker?.({
            clientX: event.clientX,
            clientY: event.clientY,
            nodeIds: getNodeIdsAtPoint(event.clientX, event.clientY),
          });
        }}
        {...bind()}
      >
        <div
          className="origin-top-left"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
