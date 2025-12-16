import { cn } from "@/lib/utils";
import { cardVariants } from "./styles";
import { Toggle } from "./Toggle";

interface FormCardProps {
  label: React.ReactNode;
  isActive: boolean;
  toggleIsActive: () => void;

  children: React.ReactNode;

  className?: string;
  expandAnimation?: {
    duration?: number;
    maxHeight?: string;
  };
}

export const FormCard: React.FC<FormCardProps> = ({
  label,
  isActive,
  toggleIsActive,
  children,
  className,
  expandAnimation = {
    duration: 300,
    maxHeight: "500px",
  },
}) => {
  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated", size: "md" }),
        className
      )}
    >
      {/* 헤더 */}
      <div className="h-10 flex w-full justify-between items-center">
        <div className="font-bold text-lg text-gray-900">{label}</div>
        <Toggle
          active={isActive}
          onToggle={toggleIsActive}
          label={""}
          variant="primary"
          size="md"
        />
      </div>
      {/* 확장 가능한 콘텐츠 영역 */}
      <div
        className={cn(
          "transition-all overflow-hidden",
          !isActive
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
    </div>
  );
};
