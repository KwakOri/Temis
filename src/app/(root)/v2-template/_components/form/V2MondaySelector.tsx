"use client";

import CardTitle from "@/components/TimeTable/FixedComponents/CardTitle";
import React from "react";

interface MondaySelectorProps {
  mondayDateStr: string;
  onDateChange: (dateStr: string) => void;
}

const V2MondaySelector = ({ mondayDateStr, onDateChange }: MondaySelectorProps) => {
  const currentMonday = new Date(mondayDateStr);

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  const goToPreviousMonday = () => {
    const previousMonday = new Date(currentMonday);
    previousMonday.setDate(previousMonday.getDate() - 7);
    onDateChange(previousMonday.toISOString().split("T")[0]);
  };

  const goToNextMonday = () => {
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    onDateChange(nextMonday.toISOString().split("T")[0]);
  };

  return (
    <div className="h-12 gap-4 flex justify-between items-center bg-timetable-card-bg shadow-[0_2px_3.4px_rgba(0,0,0,0.08)] border-2 border-timetable-card-border transition-all duration-200 grow-0 rounded-2xl px-3">
      <CardTitle size="sm" label="주간 선택" />
      <div className="flex-1 flex items-center justify-between rounded-xl">
        <button
          type="button"
          onClick={goToPreviousMonday}
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-timetable-primary hover:bg-timetable-input-hover rounded-full transition-colors"
          aria-label="이전 월요일"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className="flex-1 text-center">
          <span
            className="text-base font-semibold text-gray-800"
            role="status"
            aria-live="polite"
          >
            {formatDate(currentMonday)}
          </span>
        </div>

        <button
          type="button"
          onClick={goToNextMonday}
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-timetable-primary hover:bg-timetable-input-hover rounded-full transition-colors"
          aria-label="다음 월요일"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default V2MondaySelector;
