import React from "react";

interface DateRendererProps {
  value: string; // YYYY-MM-DD 형식
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  min?: string; // 최소 날짜 (YYYY-MM-DD)
  max?: string; // 최대 날짜 (YYYY-MM-DD)
}

const DateRenderer: React.FC<DateRendererProps> = ({
  value,
  onChange,
  id,
  disabled = false,
  placeholder = "날짜 선택",
  min,
  max,
}) => {
  // 날짜를 "YYYY년 MM월 DD일" 형식으로 포맷
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  return (
    <div className="relative w-full">
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        className={`w-full rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none ${
          disabled
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-700"
        }`}
        style={{
          colorScheme: 'light',
        }}
      />
      {!value && (
        <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
          <span className="text-gray-400">{placeholder}</span>
        </div>
      )}
    </div>
  );
};

export default DateRenderer;
