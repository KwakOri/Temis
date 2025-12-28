import { cva, type VariantProps } from "class-variance-authority";
import { ReactNode } from "react";

const optionCardVariants = cva(
  "flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all",
  {
    variants: {
      variant: {
        default: "bg-timetable-card-bg border-timetable-card-border",
        selected:
          "bg-timetable-primary border-primary shadow-lg scale-[1.02] text-timetable-form-bg",
        disabled:
          "opacity-50 cursor-not-allowed bg-timetable-card-bg border-timetable-card-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface OptionCardProps
  extends VariantProps<typeof optionCardVariants> {
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export default function OptionCard({
  isSelected = false,
  isDisabled = false,
  onClick,
  children,
  className,
}: OptionCardProps) {
  const variant = isDisabled ? "disabled" : isSelected ? "selected" : "default";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={optionCardVariants({ variant, className })}
      style={{
        boxShadow: isSelected
          ? "0 4px 6px rgba(0, 0, 0, 0.15)"
          : "0 2px 3px rgba(0, 0, 0, 0.1)",
      }}
      onClick={handleClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isDisabled && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}
