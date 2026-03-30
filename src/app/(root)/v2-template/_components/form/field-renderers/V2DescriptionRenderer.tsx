import React from "react";

interface DescriptionRendererProps 
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'placeholder' | 'onChange'> {
  value: string;
  placeholder: string;
  handleDescriptionChange: (value: string) => void;
}

const DescriptionRenderer = ({
  value,
  placeholder,
  handleDescriptionChange,
  className,
  ...props
}: DescriptionRendererProps) => {
  const baseClassName =
    "block w-full bg-timetable-input-bg rounded-xl p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-[inset_0_0_0_2px_#FF9F45] resize-none";
  const finalClassName = className 
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <textarea
      value={value}
      placeholder={placeholder}
      className={finalClassName}
      onChange={(e) => handleDescriptionChange(e.target.value)}
      {...props}
    />
  );
};

export default DescriptionRenderer;
