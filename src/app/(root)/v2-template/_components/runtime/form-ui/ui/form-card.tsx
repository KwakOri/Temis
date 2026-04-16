import { cn } from "@/lib/utils";
import { SizeProps } from "@/utils/utils";
import { cva } from "class-variance-authority";
import RuntimeCardTitle from "./card-title";
import { cardVariants } from "./styles";
import { Toggle } from "./toggle";

const cardHeaderVariants = cva("w-full flex justify-between items-center", {
  variants: {
    size: {
      sm: "h-12",
      md: "h-16",
      lg: "",
    },
  },
});

interface RuntimeFormCardProps {
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

export const RuntimeFormCard: React.FC<RuntimeFormCardProps> = ({
  label,
  isActive,
  toggleIsActive,
  children,
  className,
  expandAnimation = {
    duration: 300,
    maxHeight: "500px",
  },
  size = "sm",
}) => {
  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated", type: "button", size }),
        className
      )}
    >
      <div className={cn(cardHeaderVariants({ size }))}>
        <RuntimeCardTitle size={size} label={label as string} />
        <Toggle
          active={isActive}
          onToggle={toggleIsActive}
          label=""
          variant="primary"
          size={size}
        />
      </div>

      <div
        className={cn(
          "w-full transition-all overflow-hidden",
          !isActive ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        )}
        style={{
          transitionDuration: `${expandAnimation.duration}ms`,
        }}
      >
        <div className="flex flex-col gap-3 pb-3.5">{children}</div>
      </div>
    </div>
  );
};

export default RuntimeFormCard;
