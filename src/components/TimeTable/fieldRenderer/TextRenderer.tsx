import { cn, SizeProps } from "@/utils/utils";
import React from "react";

import { cva } from "class-variance-authority";

export const inputStyles = cva(
  "w-full bg-timetable-input-bg pl-3 text-gray-800 placeholder-gray-500 outline-none focus:outline-none focus:ring-0 focus:shadow-[inset_0_0_0_2px_#FF9F45]",
  {
    variants: {
      height: {
        sm: "h-10 rounded-lg",
        md: "h-12 rounded-xl",
        lg: "",
      },
    },
  }
);

interface TextRendererProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "placeholder" | "onChange"
  > {
  value: string;
  placeholder: string;
  handleTextChange: (value: string) => void;
  height: SizeProps;
}

const TextRenderer = ({
  value,
  placeholder,
  handleTextChange,
  height = "sm",
  className,
  ...props
}: TextRendererProps) => {
  return (
    <input
      value={value}
      placeholder={placeholder}
      className={cn(inputStyles({ height, className }))}
      onChange={(e) => handleTextChange(e.target.value)}
      {...props}
    />
  );
};

export default TextRenderer;
