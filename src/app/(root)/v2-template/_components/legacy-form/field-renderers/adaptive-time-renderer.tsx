import { SizeProps } from "@/utils/utils";
import React, { useEffect, useRef, useState } from "react";
import V2ScrollableTimePicker from "./scrollable-time-picker";

interface V2AdaptiveTimeRendererProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  height?: SizeProps;
}

const V2AdaptiveTimeRenderer: React.FC<V2AdaptiveTimeRendererProps> = ({
  value,
  onChange,
  id,
  disabled = false,
  height = "sm",
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );
      const isTouchDevice = "ontouchstart" in window;
      const isSmallScreen = window.innerWidth <= 768;

      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen));
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPicker]);

  const handleInputClick = (e: React.MouseEvent) => {
    if (!isMobile && !disabled) {
      e.preventDefault();
      setShowPicker(!showPicker);
    }
  };

  const formatTime = (timeString: string): string => {
    if (!timeString) return "";

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (timeRegex.test(timeString)) {
      return timeString;
    }

    const numbersOnly = timeString.replace(/[^0-9]/g, "");
    if (numbersOnly.length >= 3) {
      const hours = numbersOnly.slice(0, 2).padStart(2, "0");
      const minutes = numbersOnly.slice(2, 4).padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    return timeString;
  };

  return (
    <div ref={containerRef} className="w-full">
      {isMobile ? (
        <input
          id={id}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={handleInputClick}
          disabled={disabled}
          className={`w-full rounded-xl p-3 placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-[inset_0_0_0_2px_#FF9F45] bg-timetable-input-bg text-gray-800${
            disabled ? "brightness-75 cursor-not-allowed" : "brightness-100"
          }`}
        />
      ) : (
        <V2ScrollableTimePicker
          height={height}
          value={value}
          onChange={(newValue) => onChange(formatTime(newValue))}
          onClose={() => {}}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default V2AdaptiveTimeRenderer;
