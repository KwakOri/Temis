import { Toggle } from "@/components/TimeTable/FixedComponents/Toggle";
import { cn } from "@/lib/utils";
import { SizeProps } from "@/utils/utils";
import { cva } from "class-variance-authority";
import { useEffect, useState } from "react";
import CardTitle from "./CardTitle";
import { cardVariants } from "./styles";

const cardHeaderVariants = cva("w-full flex justify-between items-center", {
  variants: {
    size: {
      sm: "h-12",
      md: "h-16",
      lg: "",
    },
  },
});

interface DayCardProps {
  weekdayLabel: React.ReactNode;
  isOffline: boolean;
  onOfflineToggle: () => void;
  offlineToggleLabel?: string;
  offlineToggleActiveColor?: string;
  offlineToggleInactiveColor?: string;
  children: React.ReactNode;
  offlineMemoContent?: React.ReactNode;
  className?: string;
  expandAnimation?: {
    duration?: number;
    maxHeight?: string;
  };
  size?: SizeProps;
}

export const DayCard: React.FC<DayCardProps> = ({
  weekdayLabel,
  isOffline,
  onOfflineToggle,
  offlineToggleLabel = "휴방",
  children,
  offlineMemoContent,
  className,
  expandAnimation = {
    duration: 300,
    maxHeight: "500px",
  },
  size = "md",
}) => {
  const [isContentOverflowVisible, setIsContentOverflowVisible] =
    useState(!isOffline);

  useEffect(() => {
    if (isOffline) {
      setIsContentOverflowVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsContentOverflowVisible(true);
    }, expandAnimation.duration ?? 300);

    return () => window.clearTimeout(timeoutId);
  }, [isOffline, expandAnimation.duration]);

  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated", type: "button", size }),
        className
      )}
    >
      {/* 헤더 */}
      <div className={cn(cardHeaderVariants({ size }))}>
        <CardTitle size={size} label={weekdayLabel as string} />
        <Toggle
          active={!isOffline}
          onToggle={onOfflineToggle}
          label={""}
          variant="offline"
          size={size}
        />
      </div>

      {/* 확장 가능한 콘텐츠 영역 */}
      <div
        className={cn(
          "transition-all",
          isOffline ? "max-h-0 opacity-0" : `max-h-screen opacity-100`,
          !isOffline && isContentOverflowVisible
            ? "overflow-visible"
            : "overflow-hidden"
        )}
        style={{
          transitionDuration: `${expandAnimation.duration}ms`,
        }}
      >
        <div className="flex flex-col gap-3 pb-3.5">{children}</div>
      </div>

      {/* 오프라인 메모 */}
      {isOffline && offlineMemoContent && (
        <div className="pb-3.5">{offlineMemoContent}</div>
      )}
    </div>
  );
};
