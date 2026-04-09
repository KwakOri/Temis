"use client";

import React from "react";

interface TemplateDataTabProps {
  timeValue: string;
  mainTitleValue: string;
  subTitleValue: string;
  isGuerrilla: boolean;
  isOffline: boolean;
  onChangeTime: (value: string) => void;
  onChangeMainTitle: (value: string) => void;
  onChangeSubTitle: (value: string) => void;
  onToggleGuerrilla: (value: boolean) => void;
  onToggleOffline: (value: boolean) => void;
}

const TemplateDataTab: React.FC<TemplateDataTabProps> = ({
  timeValue,
  mainTitleValue,
  subTitleValue,
  isGuerrilla,
  isOffline,
  onChangeTime,
  onChangeMainTitle,
  onChangeSubTitle,
  onToggleGuerrilla,
  onToggleOffline,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">샘플 데이터</h3>
      <p className="text-xs text-gray-500">
        월요일 카드(첫 번째 카드)만 빠르게 조정해서 프리뷰 확인
      </p>

      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">time</label>
        <input
          type="time"
          value={timeValue}
          onChange={(event) => onChangeTime(event.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">mainTitle</label>
        <textarea
          rows={3}
          value={mainTitleValue}
          onChange={(event) => onChangeMainTitle(event.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">subTitle</label>
        <input
          type="text"
          value={subTitleValue}
          onChange={(event) => onChangeSubTitle(event.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
        <span className="text-sm text-gray-700">isGuerrilla</span>
        <input
          type="checkbox"
          checked={isGuerrilla}
          onChange={(event) => onToggleGuerrilla(event.target.checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
        <span className="text-sm text-gray-700">monday isOffline</span>
        <input
          type="checkbox"
          checked={isOffline}
          onChange={(event) => onToggleOffline(event.target.checked)}
        />
      </label>
    </div>
  );
};

export default TemplateDataTab;
