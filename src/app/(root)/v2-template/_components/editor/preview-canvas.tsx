import { useTimeTable } from "@/contexts/TimeTableContext";
import { useGesture } from "@use-gesture/react";
import { useEffect, useMemo, useState } from "react";
import V2TimeTableContent from "../scene/preview-scene";
import {
  v2_PREVIEW_SCALE_MAX_MOBILE,
  v2_PREVIEW_SCALE_MIN,
  v2_clampPreviewScale,
} from "./preview-scale";

const V2TimeTablePreview = () => {
  const { state, actions } = useTimeTable();
  const { scale, isMobile, captureSize } = state;
  const { updateScale } = actions;
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 동적으로 템플릿 크기 사용 (기본값으로 1280x720 사용)
  const templateWidth = captureSize?.width || 1280;
  const templateHeight = captureSize?.height || 720;
  
  const containerWidth = templateWidth * scale;
  const containerHeight = templateHeight * scale;

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], first, memo, touches }) => {
        if (touches > 1) return memo;

        if (first) {
          memo = [position.x, position.y];
        }

        if (!memo) {
          memo = [position.x, position.y];
        }

        const newX = memo[0] + mx;
        const newY = memo[1] + my;

        setPosition({ x: newX, y: newY });

        return memo;
      },
      onPinch: ({ offset: [scale_offset], first, memo, touches }) => {
        if (!isMobile || touches < 2) return memo;

        if (first) {
          memo = {
            scale: scale,
            position: { x: position.x, y: position.y },
          };
        }

        if (!memo) {
          memo = {
            scale: scale,
            position: { x: position.x, y: position.y },
          };
        }

        if (updateScale && Math.abs(scale_offset) > 0.001) {
          const newScale = v2_clampPreviewScale({
            value: memo.scale + scale_offset * 0.01,
            isMobile: true,
          });
          updateScale(newScale);
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
          min: v2_PREVIEW_SCALE_MIN,
          max: v2_PREVIEW_SCALE_MAX_MOBILE,
        },
        rubberband: true,
        threshold: 0.1,
        pointer: { touch: true },
      },
    }
  );

  useEffect(() => {
    if (!isMobile) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isMobile]);

  const isDraggable = true;

  useEffect(() => {
    const handleResize = () => {
      if (isMobile) {
        setPosition({ x: 0, y: 0 });
      }
    };

    if (isMobile) {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isMobile]);

  const viewportStyle = useMemo(
    () => ({
      height: isMobile ? "30vh" : "100%",
      flex: isMobile ? "none" : "1",
    }),
    [isMobile]
  );

  const alphaMatteStyle = useMemo(
    () => ({
      backgroundColor: "#0f141c",
      backgroundImage:
        "linear-gradient(45deg, #1c2330 25%, transparent 25%), linear-gradient(-45deg, #1c2330 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1c2330 75%), linear-gradient(-45deg, transparent 75%, #1c2330 75%)",
      backgroundSize: "24px 24px",
      backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
    }),
    []
  );

  const draggableStyle = useMemo(
    () => ({
      width: containerWidth,
      height: containerHeight,
      transform: `translate(${position.x}px, ${position.y}px)`,
      cursor: isDraggable ? "grab" : "default",
      transition: "width 0.1s ease, height 0.1s ease",
      touchAction: "none" as const,
    }),
    [containerHeight, containerWidth, isDraggable, position.x, position.y]
  );

  return (
    <div
      className="flex justify-center items-center h-full overflow-hidden pt-4 md:p-0 "
      style={{
        ...viewportStyle,
        ...alphaMatteStyle,
      }}
    >
      <div
        className="relative shadow-lg rounded-sm"
        style={draggableStyle}
        {...bind()}
      >
        <V2TimeTableContent />
      </div>
    </div>
  );
};

export default V2TimeTablePreview;
