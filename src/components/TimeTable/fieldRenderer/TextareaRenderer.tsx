import React from "react";

interface TextareaRendererProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "placeholder" | "onChange"
  > {
  value: string;
  placeholder: string;
  handleTextareaChange: (value: string) => void;
}

const TextareaRenderer = ({
  value,
  placeholder,
  handleTextareaChange,
  className,
  ...props
}: TextareaRendererProps) => {
  const baseClassName =
    "block w-full bg-timetable-input-bg rounded-xl p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-timetable-primary/50 resize-none";
  const finalClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <textarea
      value={value}
      placeholder={placeholder}
      className={finalClassName}
      onChange={(e) => handleTextareaChange(e.target.value)}
      {...props}
    />
  );
};

export default TextareaRenderer;
