import React, { useRef, useState } from "react";
import { defaultCards, TDefaultCard, weekdays } from "../_settings/general";
import {
  buttonThemes,
  placeholders,
  TTheme,
  weekdayOption,
} from "../_settings/settings";
import { clearAllTimeTableData } from "../_utils/localStorage";
import MondaySelector from "./MondaySelector";
// TODO: 트위터 기능 활성화 시 주석 해제
// import * as htmlToImage from "html-to-image";
// import TweetPreviewModal from "./TweetPreviewModal";

// TODO: 트위터 기능 활성화 시 주석 해제
// interface TwitterStatus {
//   isConnected: boolean;
//   twitterUsername: string | null;
// }

interface TimeTableFormProps {
  data: TDefaultCard[];
  setData: React.Dispatch<React.SetStateAction<TDefaultCard[]>>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profileText: string;
  onProfileTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentTheme: string;
  onThemeButtonClick: (value: TTheme) => void;
  mondayDateStr: string;
  onDateChange: (dateStr: string) => void;
  onDownloadClick: () => void;
  setProfileText: React.Dispatch<React.SetStateAction<string>>;
  isMobile: boolean;
  addons?: React.ReactNode;
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
  addons,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("main");

  // TODO: 트위터 관련 상태 (주석 처리됨)
  // ... (기존 트위터 관련 코드는 여기에 유지)

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

  const renderTabs = () => {
    const tabs = [{ id: "main", label: "기본 설정" }];
    if (addons) {
      tabs.push({ id: "addons", label: "추가 기능" });
    }

    return (
      <div className="flex w-full border-b border-gray-300 select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 text-sm font-bold text-center transition-all duration-200 border-b-2 ${
                isActive
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-500 border-transparent hover:bg-gray-200 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMainSettings = () => (
    <div className="space-y-6">
      {/* 테마 섹션 */}
      <div className="space-y-2">
        <h3 className="font-bold text-lg text-gray-800">테마</h3>
        <div className="flex w-full border border-gray-300 rounded-md bg-gray-100 select-none">
          {buttonThemes.map((theme) => {
            const isActive = currentTheme === theme.value;
            return (
              <button
                key={theme.value}
                onClick={() => onThemeButtonClick(theme.value as TTheme)}
                className={`flex-1 py-2 px-1 text-sm font-medium text-center transition-all duration-200 rounded-md ${
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
      </div>

      {/* 프로필 섹션 */}
      <div className="space-y-2">
        <h3 className="font-bold text-lg text-gray-800">프로필</h3>
        <input
          id="profile-text"
          value={profileText}
          onChange={onProfileTextChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder={placeholders.profileText}
        />
        <button
          onClick={handleUploadClick}
          className="w-full bg-[#3E4A82] text-white py-2 rounded-md text-sm font-medium hover:bg-[#2b2f4d] transition"
        >
          프로필 이미지 업로드
        </button>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          className="hidden"
          onChange={onImageChange}
        />
      </div>

      {/* 시간표 섹션 */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-800">시간표</h3>
        <MondaySelector
          mondayDateStr={mondayDateStr}
          onDateChange={onDateChange}
        />
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
                  <span className="text-sm text-gray-500">휴방</span>
                  <button
                    type="button"
                    className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      day.isOffline ? "bg-[#3E4A82]" : "bg-gray-300"
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

      {/* 초기화 버튼 */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onResetFormButtonClick}
          className="w-full py-2 px-4 text-sm font-medium text-center transition-all duration-200 rounded-md text-gray-600 bg-white border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-400 shadow-sm cursor-pointer"
        >
          모든 설정 초기화
        </button>
      </div>
    </div>
  );

  const renderAddonsContent = () => (addons ? <>{addons}</> : null);

  return (
    <div className="md:h-full min-h-0 md:max-w-[400px] md:min-w-[300px] md:w-1/4">
      <div className="h-full shrink-0 flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full ">
        <div className="flex-1 flex flex-col min-h-0">
          {renderTabs()}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "main" && renderMainSettings()}
            {activeTab === "addons" && renderAddonsContent()}
          </div>
        </div>

        <div className="p-4 border-t border-gray-300 bg-gray-50">
          <button
            onClick={onDownloadClick}
            className="w-full bg-[#2b2f4d] text-white py-3 rounded-md text-base font-bold hover:bg-gray-800 transition"
          >
            이미지로 저장 (1280×720)
          </button>
        </div>
        {/* TODO: 트위터 모달 (주석 처리됨) */}
        {/* <TweetPreviewModal ... /> */}
      </div>
    </div>
  );
};

export default TimeTableForm;
