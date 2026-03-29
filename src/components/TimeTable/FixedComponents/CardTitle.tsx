import { cn, SizeProps } from "@/utils/utils";
import { cva } from "class-variance-authority";

interface SampleCardTitleProps {
  label: string;
  size: SizeProps;
}

const CardTitleVariants = cva(" font-semibold  text-[#1B1612]", {
  variants: {
    size: {
      sm: "pl-1",
      md: "pl-3 text-2xl",
      lg: "",
    },
  },
});

const CardTitle = ({ size, label }: SampleCardTitleProps) => {
  return (
    <p
      style={{ letterSpacing: -1 }}
      className={cn(CardTitleVariants({ size }))}
    >
      {label}
    </p>
  );
};

export default CardTitle;
