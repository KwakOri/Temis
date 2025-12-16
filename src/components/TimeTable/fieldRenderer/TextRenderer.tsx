import React from "react";

interface TextRendererProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "placeholder" | "onChange"
  > {
  value: string;
  placeholder: string;
  handleTextChange: (value: string) => void;
}

const TextRenderer = ({
  value,
  placeholder,
  handleTextChange,
  className,
  ...props
}: TextRendererProps) => {
  const baseClassName =
    "w-full bg-timetable-input-bg rounded-xl p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-timetable-primary/50";
  const finalClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <input
      value={value}
      placeholder={placeholder}
      className={finalClassName}
      onChange={(e) => handleTextChange(e.target.value)}
      {...props}
    />
  );
};

export default TextRenderer;
