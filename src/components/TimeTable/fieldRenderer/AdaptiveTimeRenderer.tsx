import React, { useState, useEffect, useRef } from 'react';
import ScrollableTimePicker from './ScrollableTimePicker';

interface AdaptiveTimeRendererProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

const AdaptiveTimeRenderer: React.FC<AdaptiveTimeRendererProps> = ({
  value,
  onChange,
  id,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 모바일 디바이스 감지
  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window;
      const isSmallScreen = window.innerWidth <= 768;
      
      // 모바일 디바이스이거나 터치 기능이 있으면서 화면이 작은 경우
      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen));
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // 외부 클릭 감지로 피커 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  // 데스크톱에서 input 클릭 시 커스텀 피커 표시
  const handleInputClick = (e: React.MouseEvent) => {
    if (!isMobile && !disabled) {
      e.preventDefault();
      setShowPicker(!showPicker);
    }
  };

  // 시간 형식 검증 및 포맷팅
  const formatTime = (timeString: string): string => {
    if (!timeString) return "";
    
    // HH:MM 형식인지 확인
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (timeRegex.test(timeString)) {
      return timeString;
    }
    
    // 숫자만 있는 경우 형식 맞추기 (예: "930" -> "09:30")
    const numbersOnly = timeString.replace(/[^0-9]/g, '');
    if (numbersOnly.length >= 3) {
      const hours = numbersOnly.slice(0, 2).padStart(2, '0');
      const minutes = numbersOnly.slice(2, 4).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    return timeString;
  };

  return (
    <div ref={containerRef} className="w-full">
      {isMobile ? (
        // 모바일: 네이티브 시간 선택기
        <input
          id={id}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full rounded-xl p-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700'
          }`}
        />
      ) : (
        // 데스크톱: 항상 표시되는 스크롤러블 피커
        <ScrollableTimePicker
          value={value}
          onChange={(newValue) => {
            onChange(formatTime(newValue));
          }}
          onClose={() => {}} // 닫기 기능 제거
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default AdaptiveTimeRenderer;