import React, { useRef } from "react";
import { defaultCards, TDefaultCard, weekdays } from "../_settings/general";
import {
  buttonThemes,
  placeholders,
  TTheme,
  weekdayOption,
} from "../_settings/settings";
import { clearAllTimeTableData } from "../_utils/localStorage";

interface TimeTableFormProps {
  data: TDefaultCard[];
  setData: React.Dispatch<React.SetStateAction<TDefaultCard[]>>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profileText: string;
  onProfileTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentTheme: string;
  onThemeButtonClick: (value: TTheme) => void;
  mondayDateStr: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadClick: () => void;
  setProfileText: React.Dispatch<React.SetStateAction<string>>;
}

const TimeTableForm: React.FC<TimeTableFormProps> = ({
  setProfileText,
  data,
  setData,
  onImageChange,
  profileText,
  onProfileTextChange,
  currentTheme,
  onThemeButtonClick,
  mondayDateStr,
  onDateChange,
  onDownloadClick,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onResetFormButtonClick = () => {
    const isOk = confirm("모든 내용을 지우시겠습니까?");
    if (!isOk) return;
    clearAllTimeTableData();
    setProfileText("");
    setData(defaultCards);
  };

  return (
    <div className="shrink-0 w-1/4 h-full flex flex-col bg-gray-100 border-l-2 border-gray-300 ">
      <div className="flex-1 overflow-y-auto p-4">
        {/* 테마 버튼 선택 */}
        <div className="flex gap-2">
          <div className="flex w-full border border-gray-300 rounded-md bg-gray-100 mb-4 select-none">
            {buttonThemes.map((theme) => {
              const isActive = currentTheme === theme.value;
              return (
                <button
                  key={theme.value}
                  onClick={() => onThemeButtonClick(theme.value as TTheme)}
                  className={`flex-1 py-2 px-1 text-sm font-medium text-center transition-all duration-200 rounded-md
                  ${
                    isActive
                      ? "bg-white text-blue-600 border border-blue-400 shadow-sm"
                      : "text-gray-500 hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={onResetFormButtonClick}
            className={` mb-4 flex shrink-0 py-2 px-1 text-sm font-medium text-center transition-all duration-200 rounded-md text-gray-500 hover:bg-white border border-gray-300 hover:text-red-600 hover:border hover:border-red-400 hover:shadow-sm cursor-pointer"
                  `}
          >
            초기화
          </button>
        </div>

        {/* 요일 카드 */}
        <div className="flex flex-col gap-4 w-full select-none">
          {data.map((day, index) => (
            <div
              key={day.day}
              className="bg-white backdrop-blur-md rounded-xl p-4 shadow-[0_4px_5px_rgba(0,0,0,0.15)]"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">
                  {weekdays[weekdayOption][day.day]}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 ">휴방</span>
                  <button
                    type="button"
                    className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out  ${
                      day.isOffline ? "bg-[#3E4A82]" : "bg-gray-300"
                    }`}
                    onClick={() => {
                      const newData = [...data];
                      newData[index].isOffline = !newData[index].isOffline;
                      setData(newData);
                    }}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out  ${
                        day.isOffline ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div
                className={`transition-all duration-300 overflow-hidden ${
                  day.isOffline
                    ? "max-h-0 opacity-0"
                    : "max-h-[500px] opacity-100"
                }`}
              >
                <div className="pt-2 flex flex-col gap-4">
                  <input
                    type="time"
                    className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none"
                    value={day.time}
                    onChange={(e) => {
                      const newData = [...data];
                      newData[index].time = e.target.value;
                      setData(newData);
                    }}
                  />

                  <input
                    value={day.topic}
                    placeholder={placeholders.topic}
                    className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none"
                    onChange={(e) => {
                      const newData = [...data];
                      newData[index].topic = e.target.value;
                      setData(newData);
                    }}
                  />

                  <textarea
                    value={day.description}
                    placeholder={placeholders.description}
                    className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none resize-none"
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

      <div className="bg-gray-50 border-t border-gray-300 p-4 space-y-2 select-none">
        <div>
          <label className="block text-sm text-gray-700 font-semibold mb-1">
            기준 월요일 선택
          </label>
          <input
            type="date"
            value={mondayDateStr}
            onChange={onDateChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <hr className="border-t-2 border-gray-300 my-4" />

        <div className="flex flex-col gap-2">
          <button
            onClick={handleUploadClick}
            className="bg-[#3E4A82] text-white py-2 rounded-md text-sm font-medium hover:bg-[#2b2f4d] transition"
          >
            이미지 업로드
          </button>

          <input
            id="profile-text"
            value={profileText}
            onChange={onProfileTextChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={placeholders.profileText}
          />

          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            className="hidden"
            onChange={onImageChange}
          />

          <hr className="border-t-2 border-gray-300 my-2" />

          <button
            onClick={onDownloadClick}
            className="bg-[#2b2f4d] text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition"
          >
            이미지로 저장 (1280×720)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeTableForm;
