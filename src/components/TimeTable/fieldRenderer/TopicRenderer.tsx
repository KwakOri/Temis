import React from "react";

interface TopicRendererProps 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'placeholder' | 'onChange'> {
  value: string;
  placeholder: string;
  handleTopicChange: (value: string) => void;
}

const TopicRenderer = ({
  value,
  placeholder,
  handleTopicChange,
  className,
  ...props
}: TopicRendererProps) => {
  const baseClassName = "w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none";
  const finalClassName = className 
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <input
      value={value}
      placeholder={placeholder}
      className={finalClassName}
      onChange={(e) => handleTopicChange(e.target.value)}
      {...props}
    />
  );
};

export default TopicRenderer;
