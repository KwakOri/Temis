import { Toggle } from "@/components/TimeTable/FixedComponents/Toggle";
import { cn } from "@/lib/utils";
import { SizeProps } from "@/utils/utils";
import { cva } from "class-variance-authority";
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
  size?: SizeProps;
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
  size = "md",
}) => {
  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated", type: "button", size }),
        className
      )}
    >
      {/* 헤더 */}
      <div className={cn(cardHeaderVariants({ size }))}>
        <CardTitle size={size} label={label as string} />
        <Toggle
          active={isActive}
          onToggle={toggleIsActive}
          label={""}
          variant="primary"
          size={size}
        />
      </div>
      {/* 확장 가능한 콘텐츠 영역 */}
      <div
        className={cn(
          "w-full transition-all overflow-hidden",
          !isActive
            ? "max-h-0 opacity-0"
            : `max-h-[${expandAnimation.maxHeight}] opacity-100`
        )}
        style={{
          transitionDuration: `${expandAnimation.duration}ms`,
        }}
      >
        <div className="flex flex-col gap-3 pb-3.5">{children}</div>
      </div>

      {/* 오프라인 메모 */}
    </div>
  );
};
