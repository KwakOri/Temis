import MondaySelector from "@/components/TimeTable/MondaySelector";
import ResetButton from "@/components/TimeTable/ResetButton";
import TimeTableFormTabs from "@/components/TimeTable/TimeTableFormTabs";
import { useTimeTable, useTimeTableActions } from "@/contexts/TimeTableContext";
import { offlineToggle } from "@/utils/time-table/data";
import React, { PropsWithChildren, useRef, useState } from "react";

interface TimeTableFormProps {
  addons?: React.ReactNode;
  onReset: () => void;
}

const TimeTableForm = ({
  addons,
  children,
  onReset,
}: PropsWithChildren<TimeTableFormProps>) => {
  const { state, actions } = useTimeTable();

  const { profileText, mondayDateStr, imageSrc, isProfileTextVisible } = state;
  const {
    handleImageChange,
    handleProfileTextChange,
    handleDateChange,
    updateImageSrc,
    toggleProfileTextVisible,
  } = actions;
  const { downloadImage } = useTimeTableActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("main");

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageDelete = () => {
    updateImageSrc(null);
  };

  const onChangeActiveTab = (nextTab: string) => {
    setActiveTab(nextTab);
  };

  const renderMainSettings = () => (
    <div className="space-y-6">
      {/* 프로필 섹션 */}
      <div className="space-y-2">
        <h3 className="font-bold text-lg text-gray-800">이미지</h3>

        {/* 사용자 이름 표시 토글 버튼 */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            사용자 이름 표시
          </label>
          <button
            onClick={toggleProfileTextVisible}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isProfileTextVisible
                ? offlineToggle.activeColor
                : offlineToggle.inactiveColor
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isProfileTextVisible ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <input
          id="profile-text"
          value={profileText}
          onChange={handleProfileTextChange}
          disabled={!isProfileTextVisible}
          className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            !isProfileTextVisible ? "bg-gray-100 text-gray-400" : ""
          }`}
          placeholder={"내용을 입력해 주세요"}
        />
        <div className="flex gap-2">
          <button
            onClick={handleUploadClick}
            className="flex-1 bg-[#3E4A82] text-white py-2 rounded-md text-sm font-medium hover:bg-[#2b2f4d] transition"
          >
            {imageSrc ? "이미지 변경" : "이미지 업로드"}
          </button>
          {imageSrc && (
            <button
              onClick={handleImageDelete}
              className="px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition flex items-center justify-center"
              title="이미지 삭제"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* 시간표 섹션 */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-800">시간표</h3>
        <MondaySelector
          mondayDateStr={mondayDateStr}
          onDateChange={handleDateChange}
        />

        {/* settings.ts에서 구성된 시간표 입력 컴포넌트 */}
        {children}
      </div>
    </div>
  );

  const renderAddonsContent = () => (addons ? <>{addons}</> : null);

  return (
    <div className="md:h-full min-h-0 md:max-w-[400px] md:min-w-[300px] md:w-1/4 h-full">
      <div className="h-full shrink-0 flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full ">
        <div className="flex-1 flex flex-col min-h-0">
          <TimeTableFormTabs
            activeTab={activeTab}
            onChangeActiveTab={onChangeActiveTab}
            isAddons={!!addons}
          />
          <div className="flex-1 overflow-y-auto p-4 h-full">
            {activeTab === "main" && renderMainSettings()}
            {activeTab === "addons" && renderAddonsContent()}
          </div>
        </div>

        <div className="p-4 border-t border-gray-300 bg-gray-50 flex gap-2">
          <button
            onClick={downloadImage}
            className="w-full bg-[#2b2f4d] text-white py-3 rounded-md text-base font-bold hover:bg-gray-800 transition"
          >
            이미지로 저장 (1280×720)
          </button>
          <ResetButton onReset={onReset} />
        </div>
      </div>
    </div>
  );
};

export default TimeTableForm;
