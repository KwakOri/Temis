import { SizeProps } from "@/utils/utils";
import React, { useEffect, useState } from "react";
import ScrollableTimePicker from "./scrollable-time-picker";

interface AdaptiveTimeRendererProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  height: SizeProps;
}

const AdaptiveTimeRenderer: React.FC<AdaptiveTimeRendererProps> = ({
  value,
  onChange,
  id,
  disabled = false,
  height,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 디바이스 감지
  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );
      const isTouchDevice = "ontouchstart" in window;
      const isSmallScreen = window.innerWidth <= 768;

      // 모바일 디바이스이거나 터치 기능이 있으면서 화면이 작은 경우
      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen));
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // 시간 형식 검증 및 포맷팅
  const formatTime = (timeString: string): string => {
    if (!timeString) return "";

    // HH:MM 형식인지 확인
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (timeRegex.test(timeString)) {
      return timeString;
    }

    // 숫자만 있는 경우 형식 맞추기 (예: "930" -> "09:30")
    const numbersOnly = timeString.replace(/[^0-9]/g, "");
    if (numbersOnly.length >= 3) {
      const hours = numbersOnly.slice(0, 2).padStart(2, "0");
      const minutes = numbersOnly.slice(2, 4).padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    return timeString;
  };

  return (
    <div className="w-full">
      {isMobile ? (
        // 모바일: 네이티브 시간 선택기
        <input
          id={id}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full rounded-xl p-3 placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-[inset_0_0_0_2px_#FF9F45] bg-timetable-input-bg text-gray-800${
            disabled ? "brightness-75 cursor-not-allowed" : `brightness-100`
          }`}
        />
      ) : (
        // 데스크톱: 항상 표시되는 스크롤러블 피커
        <ScrollableTimePicker
          height={height}
          value={value}
          onChange={(newValue) => {
            onChange(formatTime(newValue));
          }}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default AdaptiveTimeRenderer;
