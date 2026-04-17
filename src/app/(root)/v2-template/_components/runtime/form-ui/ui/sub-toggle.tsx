import { cn } from "@/lib/utils";
import { toggleHandleVariants, toggleVariants } from "./styles";

interface ToggleProps {
  active: boolean;
  onToggle: () => void;
  label?: string;
  variant?: "primary" | "offline" | "guerrilla";
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
}

export const SubToggle: React.FC<ToggleProps> = ({
  active,
  onToggle,
  label,
  variant = "primary",
  size = "md",
  className,
  ariaLabel,
  title,
  disabled = false,
}) => {
  const translateClass = {
    sm: active ? "translate-x-9" : "translate-x-1",
    md: active ? "translate-x-10" : "translate-x-1",
    lg: active ? "translate-x-6" : "translate-x-0",
  }[size];

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
          {label}
        </span>
      )}
      <button
        type="button"
        data-active={active}
        className={cn(
          toggleVariants({ size, variant }),
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={onToggle}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        aria-disabled={disabled}
      >
        <div className={cn(toggleHandleVariants({ size }), translateClass)} />
      </button>
    </div>
  );
};
