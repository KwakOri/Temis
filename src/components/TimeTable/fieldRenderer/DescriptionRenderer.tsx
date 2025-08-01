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
  const baseClassName = "w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none resize-none";
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
