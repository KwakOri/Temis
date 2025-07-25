import { TDefaultCard, weekdays } from "../_settings/general";
import {
  buttonThemes,
  TTheme,
  weekdayOption,
} from "../_settings/settings";
import React from "react";

interface TimeTableFormProps {
  data: TDefaultCard[];
  setData: React.Dispatch<React.SetStateAction<TDefaultCard[]>>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profileText: string;
  onProfileTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentTheme: string;
  onThemeButtonClick: (value: TTheme) => void;
}

const TimeTableForm: React.FC<TimeTableFormProps> = ({
  data,
  setData,
  onImageChange,
  profileText,
  onProfileTextChange,
  currentTheme,
  onThemeButtonClick,
}) => {
  return (
    <div className="shrink-0 w-1/4 h-full flex flex-col bg-gray-100 p-4">
      <div className="flex-1 overflow-y-auto relative pb-6">
        {/* 테마 버튼 선택 (탭 UI 스타일) */}
        <div className="flex w-full border border-gray-300 rounded-md bg-gray-100 mx-2 mt-2">
          {buttonThemes.map((theme) => {
            const isActive = currentTheme === theme.value;
            return (
              <button
                key={theme.value}
                onClick={() => onThemeButtonClick(theme.value as TTheme)}
                className={`flex-1 py-2 px-1 m-2 text-sm font-medium text-center transition-all duration-200 rounded-md
          ${
            isActive
              ? "bg-white text-blue-600 border border-blue-400 shadow-sm"
              : "text-gray-500 hover:bg-gray-200 border border-transparent"
          }
        `}
              >
                {theme.label}
              </button>
            );
          })}
        </div>

        {/* 프로필 이미지 + 텍스트 */}
        <div className="flex-shrink-0 flex flex-col gap-4 justify-center items-center py-8 rounded-md mx-2">
          <label
            htmlFor="file-upload"
            className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
          >
            프로필 사진 업로드
          </label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={onImageChange}
          />
          <input
            value={profileText}
            className="bg-gray-200 rounded-md p-2 w-full "
            onChange={onProfileTextChange}
            placeholder="프로필 텍스트 입력"
          />
        </div>

        {/* 요일 카드 */}
        <div className="flex flex-col gap-4 w-full">
          {data.map((day, index) => (
            <div
              key={day.day}
              className="bg-white backdrop-blur-md mx-2 rounded-xl p-4 shadow-[0_4px_5px_rgba(0,0,0,0.15)]"
            >
              {/* 요일 + 휴일 체크 */}
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">
                  {weekdays[weekdayOption][day.day]}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">휴방</span>
                  <button
                    type="button"
                    className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      day.isOffline ? "bg-blue-500" : "bg-gray-300"
                    }`}
                    onClick={() => {
                      const newData = [...data];
                      newData[index].isOffline = !newData[index].isOffline;
                      setData(newData);
                    }}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
                        day.isOffline ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 접힘 처리 영역 */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  day.isOffline
                    ? "max-h-0 opacity-0"
                    : "max-h-[500px] opacity-100"
                }`}
              >
                {/* 내부 래퍼로 마진 분리 */}
                <div className="pt-2 flex flex-col gap-4">
                  {/* 시간 입력 */}
                  <input
                    type="time"
                    className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none mt-2"
                    value={day.time}
                    onChange={(e) => {
                      const newData = [...data];
                      newData[index].time = e.target.value;
                      setData(newData);
                    }}
                  />

                  {/* Subtitle (topic) */}
                  <div className="flex flex-col">
                    <input
                      value={day.topic}
                      maxLength={7}
                      placeholder="Subtitle"
                      className="w-full bg-gray-100 rounded-xl p-3 text-gray-400 placeholder-gray-400 focus:outline-none"
                      onChange={(e) => {
                        const newData = [...data];
                        newData[index].topic = e.target.value;
                        setData(newData);
                      }}
                    />
                  </div>

                  {/* Description */}
                  <textarea
                    value={day.description}
                    placeholder="설명 입력"
                    className="w-full bg-gray-100 rounded-xl p-3 text-gray-400 placeholder-gray-400 focus:outline-none resize-none"
                    onChange={(e) => {
                      const newData = [...data];
                      newData[index].description = e.target.value;
                      setData(newData);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeTableForm;
