import React, { useEffect, useRef, useState } from "react";

interface ScrollableTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  disabled?: boolean;
}

const ScrollableTimePicker: React.FC<ScrollableTimePickerProps> = ({
  value,
  onChange,
  onClose,
  disabled = false,
}) => {
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 시간 문자열을 시간과 분으로 파싱
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      setSelectedHour(hours || 0);
      setSelectedMinute(minutes || 0);
    }
  }, [value]);

  // 외부 클릭으로 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // 시간 선택 핸들러
  const handleTimeSelect = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    const timeString = `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
    onChange(timeString);
    setShowDropdown(false);
  };

  // 시간 배열 생성
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* 시간 표시 버튼 */}
      <button
        type="button"
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        disabled={disabled}
        className={`w-full rounded-xl p-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-timetable-primary/50 flex items-center justify-between transition-colors bg-timetable-input-bg text-gray-800 ${
          disabled
            ? "brightness-90 cursor-not-allowed"
            : "brightness-100 hover:bg-timetable-input-hover"
        }`}
      >
        <span
          className={`font-normal ${
            disabled ? "text-gray-400" : "text-gray-800"
          }`}
        >
          {`${selectedHour.toString().padStart(2, "0")}:${selectedMinute
            .toString()
            .padStart(2, "0")}`}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            showDropdown ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {showDropdown && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="flex">
            {/* 시간 리스트 */}
            <div className="flex-1 border-r border-gray-200">
              <div className="p-2 bg-gray-50 text-xs font-medium text-gray-600 text-center">
                시간
              </div>
              <div className="max-h-32 overflow-y-auto scrollbar-hide">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleTimeSelect(hour, selectedMinute)}
                    className={`w-full p-2 text-sm hover:bg-blue-50 transition-colors ${
                      hour === selectedHour
                        ? "bg-blue-100 text-blue-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {hour.toString().padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* 분 리스트 */}
            <div className="flex-1">
              <div className="p-2 bg-gray-50 text-xs font-medium text-gray-600 text-center">
                분
              </div>
              <div className="max-h-32 overflow-y-auto scrollbar-hide">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => handleTimeSelect(selectedHour, minute)}
                    className={`w-full p-2 text-sm hover:bg-blue-50 transition-colors ${
                      minute === selectedMinute
                        ? "bg-blue-100 text-blue-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {minute.toString().padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrollableTimePicker;
