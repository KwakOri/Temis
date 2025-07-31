import MondaySelector from "@/components/TimeTable/MondaySelector";
import ResetButton from "@/components/TimeTable/ResetButton";
import TimeTableFormTabs from "@/components/TimeTable/TimeTableFormTabs";
import { useTimeTable, useTimeTableActions } from "@/contexts/TimeTableContext";
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
  const { profileText, mondayDateStr, imageSrc } = state;
  const { handleImageChange, handleProfileTextChange, handleDateChange, updateImageSrc } =
    actions;
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
        <h3 className="font-bold text-lg text-gray-800">프로필</h3>
        <input
          id="profile-text"
          value={profileText}
          onChange={handleProfileTextChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder={"사용자 이름"}
        />
        <div className="flex gap-2">
          <button
            onClick={handleUploadClick}
            className="flex-1 bg-[#3E4A82] text-white py-2 rounded-md text-sm font-medium hover:bg-[#2b2f4d] transition"
          >
            {imageSrc ? "프로필 이미지 변경" : "프로필 이미지 업로드"}
          </button>
          {imageSrc && (
            <button
              onClick={handleImageDelete}
              className="px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition flex items-center justify-center"
              title="프로필 이미지 삭제"
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

      {/* 초기화 버튼 */}
      {/* <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onResetFormButtonClick}
          className="w-full py-2 px-4 text-sm font-medium text-center transition-all duration-200 rounded-md text-gray-600 bg-white border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-400 shadow-sm cursor-pointer"
        >
          모든 설정 초기화
        </button>
      </div> */}
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
