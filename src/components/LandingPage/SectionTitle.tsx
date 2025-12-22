import { cn } from "@/utils/utils";
import { cva, VariantProps } from "class-variance-authority";

const SectionTitleVariants = cva(" text-center font-bold ", {
  variants: {
    intent: {
      white: "text-white",
      black: "text-[#1B1612]",
    },
    size: {
      sm: "text-base",
      md: "text-xl",
      lg: "text-2xl",
    },
  },
  defaultVariants: {
    intent: "black",
    size: "md",
  },
});

type SectionTitleVariantsProps = VariantProps<typeof SectionTitleVariants>;

interface SectionTitleProps extends SectionTitleVariantsProps {
  label: string;
}

const SectionTitle = ({ intent, size, label }: SectionTitleProps) => {
  return (
    <h2 className={cn(SectionTitleVariants({ intent, size }))}>{label}</h2>
  );
};

export default SectionTitle;
