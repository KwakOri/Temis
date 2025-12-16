import { Toggle } from "@/components/TimeTable/FixedComponents/Toggle";
import { cn } from "@/lib/utils";
import { cardVariants } from "./styles";

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
}

export const SampleDayCard: React.FC<DayCardProps> = ({
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
}) => {
  return (
    <div className={cn(cardVariants({ variant: "elevated" }), className)}>
      {/* 헤더 */}
      <div className="h-10 flex w-full justify-between items-center">
        <div className="font-bold text-lg text-gray-900">{weekdayLabel}</div>
        <Toggle
          active={!isOffline}
          onToggle={onOfflineToggle}
          label={""}
          variant="offline"
          size="md"
        />
      </div>

      {/* 확장 가능한 콘텐츠 영역 */}
      <div
        className={cn(
          "transition-all overflow-hidden",
          isOffline
            ? "max-h-0 opacity-0"
            : `max-h-[${expandAnimation.maxHeight}] opacity-100`
        )}
        style={{
          transitionDuration: `${expandAnimation.duration}ms`,
        }}
      >
        <div className="flex flex-col gap-3 mt-4">{children}</div>
      </div>

      {/* 오프라인 메모 */}
      {isOffline && offlineMemoContent && (
        <div className="mt-4">{offlineMemoContent}</div>
      )}
    </div>
  );
};
