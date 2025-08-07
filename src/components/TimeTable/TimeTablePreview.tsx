import { useTimeTable } from "@/contexts/TimeTableContext";
import { useGesture } from "@use-gesture/react";
import { PropsWithChildren, useEffect, useState } from "react";

const TimeTablePreview = ({ children }: PropsWithChildren) => {
  const { state, actions } = useTimeTable();
  const { scale, weekDates, isMobile, captureSize } = state;
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
          const newScale = Math.min(
            Math.max(memo.scale + scale_offset * 0.01, 0.1),
            1.0
          );
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
        scaleBounds: { min: 0.1, max: 1.0 },
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
  }, [scale, isMobile]);

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

  const getViewportStyle = () => ({
    height: isMobile ? "30vh" : "100%",
    flex: isMobile ? "none" : "1",
  });

  const getDraggableStyle = () => ({
    width: containerWidth,
    height: containerHeight,
    transform: `translate(${position.x}px, ${position.y}px)`,
    cursor: isDraggable ? "grab" : "default",
    transition: "width 0.1s ease, height 0.1s ease",
    touchAction: "none",
  });

  if (weekDates.length === 0) return null;

  return (
    <div
      className="flex justify-center items-center h-full overflow-hidden pt-4 md:p-0 "
      style={getViewportStyle()}
    >
      <div
        className="relative shadow-lg rounded-sm"
        style={getDraggableStyle()}
        {...bind()}
      >
        {children}
      </div>
    </div>
  );
};

export default TimeTablePreview;
