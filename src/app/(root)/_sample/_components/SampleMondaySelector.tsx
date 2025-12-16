"use client";

import { cn } from "@/lib/utils";
import React, { CSSProperties } from "react";
import { cardVariants } from "./styles";

interface MondaySelectorProps {
  style?: CSSProperties;
  mondayDateStr: string;
  onDateChange: (dateStr: string) => void;
}

const SampleMondaySelector: React.FC<MondaySelectorProps> = ({
  mondayDateStr,
  onDateChange,
  style,
}) => {
  // 현재 월요일 날짜를 Date 객체로 변환
  const currentMonday = new Date(mondayDateStr);

  // 월/일 형식으로 표시
  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // 이전 월요일로 이동
  const goToPreviousMonday = () => {
    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(currentMonday.getDate() - 7);
    const newDateStr = prevMonday.toISOString().split("T")[0];
    onDateChange(newDateStr);
  };

  // 다음 월요일로 이동
  const goToNextMonday = () => {
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(currentMonday.getDate() + 7);
    const newDateStr = nextMonday.toISOString().split("T")[0];
    onDateChange(newDateStr);
  };

  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated", type: "button" }),
        "w-full flex justify-center items-center"
      )}
      style={{}}
    >
      {/* 날짜 선택 영역 */}
      <div className="flex w-full h-12 items-center justify-center bg-timetable-input-bg rounded-full px-4">
        {/* 이전 월요일 버튼 */}
        <button
          type="button"
          onClick={goToPreviousMonday}
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-timetable-primary hover:bg-timetable-input-hover rounded-full transition-colors"
          aria-label="이전 월요일"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* 월/일 표시 */}
        <div className="flex-1 text-center">
          <span
            className="text-base font-semibold text-gray-800"
            role="status"
            aria-live="polite"
          >
            {formatDate(currentMonday)}
          </span>
        </div>

        {/* 다음 월요일 버튼 */}
        <button
          type="button"
          onClick={goToNextMonday}
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-timetable-primary hover:bg-timetable-input-hover rounded-full transition-colors"
          aria-label="다음 월요일"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SampleMondaySelector;
