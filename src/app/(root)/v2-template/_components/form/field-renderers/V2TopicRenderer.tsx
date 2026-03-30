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
  const baseClassName =
    "w-full bg-timetable-input-bg rounded-xl p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-[inset_0_0_0_2px_#FF9F45]";
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
