import TimeTableContent from "./TimeTableContent";

import { useGesture } from "@use-gesture/react";
import React, { useEffect, useState } from "react";
import { TDefaultCard } from "../../_settings/general";
import { TTheme } from "../../_settings/settings";

export interface TimeTablePreviewProps {
  currentTheme: TTheme;
  scale: number;
  data: TDefaultCard[];
  weekDates: Date[];
  imageSrc: string | null;
  profileText: string;
  isMobile: boolean;
  onScaleChange?: (newScale: number) => void;
}

const TimeTablePreview: React.FC<TimeTablePreviewProps> = ({
  currentTheme,
  scale,
  data,
  weekDates,
  imageSrc,
  profileText,
  isMobile,
  onScaleChange,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const containerWidth = 1280 * scale;
  const containerHeight = 720 * scale;

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

        if (onScaleChange && Math.abs(scale_offset) > 0.001) {
          const newScale = Math.min(
            Math.max(memo.scale + scale_offset * 0.01, 0.1),
            1.0
          );
          onScaleChange(newScale);
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
        <TimeTableContent
          currentTheme={currentTheme}
          scale={scale}
          data={data}
          weekDates={weekDates}
          imageSrc={imageSrc}
          profileText={profileText}
        />
      </div>
    </div>
  );
};

export default TimeTablePreview;
