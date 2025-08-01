import React from "react";

interface TimeRendererProps {
  handleHourChange: (hour: number) => void;
  handleMinuteChange: (minute: number) => void;
  hour: number;
  minute: number;
  // 시간 입력 필드의 추가 속성들
  hourProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max"
  >;
  minuteProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max" | "step"
  >;
  // 컨테이너 스타일링
  containerClassName?: string;
  separatorClassName?: string;
}

const TimeRenderer = ({
  handleHourChange,
  handleMinuteChange,
  hour,
  minute,
  hourProps = {},
  minuteProps = {},
  containerClassName,
  separatorClassName,
}: TimeRendererProps) => {
  const baseInputClassName =
    "w-full bg-gray-100 p-3 text-gray-700 placeholder-gray-400 focus:outline-none text-center";
  const defaultContainerClassName =
    "flex gap-2 items-center bg-gray-100 rounded-xl overflow-hidden";
  const defaultSeparatorClassName = "text-gray-500 font-semibold";

  const finalContainerClassName = containerClassName
    ? `${defaultContainerClassName} ${containerClassName}`
    : defaultContainerClassName;

  const finalSeparatorClassName = separatorClassName
    ? `${defaultSeparatorClassName} ${separatorClassName}`
    : defaultSeparatorClassName;

  const hourClassName = hourProps.className
    ? `${baseInputClassName} ${hourProps.className}`
    : baseInputClassName;

  const minuteClassName = minuteProps.className
    ? `${baseInputClassName} ${minuteProps.className}`
    : baseInputClassName;

  return (
    <div className={finalContainerClassName}>
      <div className="flex-1">
        <input
          type="number"
          min="0"
          max="24"
          value={hour}
          className={hourClassName}
          placeholder="시"
          onChange={(e) => handleHourChange(parseInt(e.target.value) || 0)}
          {...hourProps}
        />
      </div>
      <span className={finalSeparatorClassName}>:</span>
      <div className="flex-1">
        <input
          type="number"
          min="0"
          max="60"
          step="5"
          value={minute}
          className={minuteClassName}
          placeholder="분"
          onChange={(e) => handleMinuteChange(parseInt(e.target.value) || 0)}
          {...minuteProps}
        />
      </div>
    </div>
  );
};

export default TimeRenderer;
