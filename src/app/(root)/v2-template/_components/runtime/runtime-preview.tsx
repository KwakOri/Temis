import { useTemplateRuntimeUIContext } from "@/contexts/v2/template-runtime-ui-context";
import { useGesture } from "@use-gesture/react";
import { useEffect, useMemo, useState } from "react";
import {
  v2_PREVIEW_SCALE_MAX_MOBILE,
  v2_PREVIEW_SCALE_MIN,
  v2_clampPreviewScale,
} from "../shared/preview-scale";
import V2TimeTableContent from "../scene/preview-scene";

const V2RuntimePreview = () => {
  const { state, actions } = useTemplateRuntimeUIContext();
  const { scale, captureSize, isMobile } = state;
  const { updateScale } = actions;
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const templateWidth = captureSize?.width || 1280;
  const templateHeight = captureSize?.height || 720;
  const containerWidth = templateWidth * scale;
  const containerHeight = templateHeight * scale;

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], first, memo, touches }) => {
        if (touches > 1) return memo;

        if (first || !memo) {
          memo = [position.x, position.y];
        }

        const newX = memo[0] + mx;
        const newY = memo[1] + my;

        setPosition({ x: newX, y: newY });
        return memo;
      },
      onPinch: ({ offset: [scaleOffset], first, memo, touches }) => {
        if (!isMobile || touches < 2) return memo;

        if (first || !memo) {
          memo = {
            scale,
            position: { x: position.x, y: position.y },
          };
        }

        if (Math.abs(scaleOffset) > 0.001) {
          const nextScale = v2_clampPreviewScale({
            value: memo.scale + scaleOffset * 0.01,
            isMobile: true,
          });
          updateScale(nextScale);
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

  const draggableStyle = useMemo(
    () => ({
      width: containerWidth,
      height: containerHeight,
      transform: `translate(${position.x}px, ${position.y}px)`,
      cursor: "grab",
      transition: "width 0.1s ease, height 0.1s ease",
      touchAction: "none" as const,
    }),
    [containerHeight, containerWidth, position.x, position.y]
  );

  return (
    <section
      className="relative flex-1 min-h-0 overflow-hidden"
      style={{
        backgroundColor: "#f5ece5",
        backgroundImage:
          "linear-gradient(45deg, #e8d9cd 25%, transparent 25%), linear-gradient(-45deg, #e8d9cd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8d9cd 75%), linear-gradient(-45deg, transparent 75%, #e8d9cd 75%)",
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
      }}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-20">
        <label className="pointer-events-auto inline-flex items-center gap-2 rounded border border-timetable-card-border bg-timetable-card-bg/95 px-3 py-2 text-xs text-gray-700 shadow-[0_2px_3.4px_rgba(0,0,0,0.08)]">
          <span>배율 {scale.toFixed(2)}x</span>
          <input
            type="range"
            min={0.1}
            max={1.2}
            step={0.01}
            value={scale}
            className="accent-timetable-primary"
            onChange={(event) => {
              const nextScale = Number(event.target.value);
              updateScale(
                v2_clampPreviewScale({ value: nextScale, isMobile })
              );
            }}
          />
        </label>
      </div>
      <div className="h-full min-h-0 flex items-center justify-center overflow-hidden p-6">
        <div
          className="relative rounded-sm shadow-lg"
          style={draggableStyle}
          {...bind()}
        >
          <V2TimeTableContent />
        </div>
      </div>
    </section>
  );
};

export default V2RuntimePreview;
