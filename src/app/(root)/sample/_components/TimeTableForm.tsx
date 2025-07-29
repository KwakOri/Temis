import React, { useEffect, useRef, useState } from "react";
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
  isMobile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TODO: 트위터 기능 활성화 시 주석 해제
  // // 트위터 관련 상태
  // const [twitterStatus, setTwitterStatus] = useState<TwitterStatus>({
  //   isConnected: false,
  //   twitterUsername: null
  // });
  // const [tweetText, setTweetText] = useState("📅 이번 주 시간표를 공유합니다! #시간표 #스케줄");
  // const [isTwitterUploading, setIsTwitterUploading] = useState(false);
  // const [twitterMessage, setTwitterMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  // const [showTweetModal, setShowTweetModal] = useState(false);

  // 모바일 아코디언 상태 관리
  const [activeTab, setActiveTab] = useState<"id1" | "id2" | null>(
    isMobile ? "id1" : null
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const toggleTab = (tabId: "id1" | "id2") => {
    if (!isMobile) return;
    setActiveTab(activeTab === tabId ? null : tabId);
  };

  // isMobile 상태 변경 시 activeTab 초기화
  useEffect(() => {
    if (isMobile) {
      setActiveTab("id1"); // 모바일로 전환 시 첫 번째 탭 열기
    } else {
      setActiveTab(null); // 데스크톱으로 전환 시 초기화
    }
  }, [isMobile]);

  // TODO: 트위터 기능 활성화 시 주석 해제
  // // 트위터 연동 상태 확인
  // useEffect(() => {
  //   const checkTwitterStatus = async () => {
  //     try {
  //       const response = await fetch('/api/user/twitter-status', {
  //         credentials: 'include',
  //       });
  //
  //       if (response.ok) {
  //         const data = await response.json();
  //         setTwitterStatus(data);
  //       }
  //     } catch (error) {
  //       console.error('Failed to check Twitter status:', error);
  //     }
  //   };
  //
  //   checkTwitterStatus();
  // }, []);

  // TODO: 트위터 기능 활성화 시 주석 해제
  // // 트위터 메시지 자동 제거
  // useEffect(() => {
  //   if (twitterMessage) {
  //     const timer = setTimeout(() => {
  //       setTwitterMessage(null);
  //     }, 5000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [twitterMessage]);

  // TODO: 트위터 기능 활성화 시 주석 해제
  // // 트윗 미리보기 모달 열기
  // const handleTwitterPreview = () => {
  //   if (!twitterStatus.isConnected) {
  //     setTwitterMessage({
  //       type: 'error',
  //       text: '트위터 계정을 먼저 연동해주세요. 마이페이지에서 연동할 수 있습니다.'
  //     });
  //     return;
  //   }
  //
  //   setShowTweetModal(true);
  // };

  // TODO: 트위터 기능 활성화 시 주석 해제
  // // 실제 트위터 업로드 (모달에서 확인 버튼 클릭 시)
  // const handleConfirmTweet = async (finalTweetText: string) => {
  //   try {
  //     setIsTwitterUploading(true);
  //     setTwitterMessage(null);
  //
  //     // 시간표 이미지 생성
  //     const node = document.getElementById("timetable");
  //     if (!node) {
  //       throw new Error('시간표를 찾을 수 없습니다.');
  //     }
  //
  //     const dataUrl = await htmlToImage.toPng(node, {
  //       width: 1280,
  //       height: 720,
  //       pixelRatio: 1,
  //       style: {
  //         transform: "scale(1)",
  //         transformOrigin: "top left",
  //       },
  //     });
  //
  //     // dataUrl을 Blob으로 변환
  //     const response = await fetch(dataUrl);
  //     const blob = await response.blob();
  //
  //     // FormData 생성
  //     const formData = new FormData();
  //     formData.append('text', finalTweetText);
  //     formData.append('image', blob, 'timetable.png');
  //
  //     // 트위터 API로 업로드
  //     const uploadResponse = await fetch('/api/twitter/post', {
  //       method: 'POST',
  //       credentials: 'include',
  //       body: formData
  //     });
  //
  //     const result = await uploadResponse.json();
  //
  //     if (uploadResponse.ok && result.success) {
  //       setTwitterMessage({
  //         type: 'success',
  //         text: `트윗이 성공적으로 게시되었습니다! @${twitterStatus.twitterUsername}`
  //       });
  //       setTweetText(finalTweetText); // 성공한 텍스트로 업데이트
  //       setShowTweetModal(false);
  //     } else {
  //       throw new Error(result.error || '트윗 게시에 실패했습니다.');
  //     }
  //
  //   } catch (error) {
  //     console.error('Twitter upload error:', error);
  //     setTwitterMessage({
  //       type: 'error',
  //       text: error instanceof Error ? error.message : '트윗 업로드 중 오류가 발생했습니다.'
  //     });
  //   } finally {
  //     setIsTwitterUploading(false);
  //   }
  // };

  const onResetFormButtonClick = () => {
    const isOk = confirm("모든 내용을 지우시겠습니까?");
    if (!isOk) return;
    clearAllTimeTableData();
    setProfileText("");
    setData(defaultCards);
  };

  return (
    <div
      className={`shrink-0 w-100 ${
        isMobile ? "h-auto" : "h-full"
      } flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full md:max-w-[400px] md:min-w-[300px] md:w-1/4`}
    >
      {/* 모바일 토글 헤더 - 메인 설정 */}
      {isMobile && (
        <button
          onClick={() => toggleTab("id1")}
          className="flex items-center justify-between p-4 bg-gray-200 border-b border-gray-300 hover:bg-gray-300 transition-colors"
        >
          <span className="font-medium text-gray-700">시간표 설정</span>
          <svg
            className={`w-5 h-5 transition-transform ${
              activeTab === "id1" ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      <div
        id="id1"
        className={`${
          isMobile ? "" : "flex-1"
        } transition-all duration-300 box-border  ${
          isMobile
            ? activeTab === "id1"
              ? "max-h-[calc(100vh-16rem)] overflow-y-auto p-4"
              : "max-h-0 p-0 overflow-hidden"
            : "overflow-y-auto p-4 "
        }`}
      >
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
            className={` mb-4 flex shrink-0 py-2 px-1 text-sm font-medium text-center transition-all duration-200 rounded-md text-gray-500 hover:bg-white border border-gray-300 hover:text-red-600 hover:border hover:border-red-400 hover:shadow-sm cursor-pointer "
                  `}
          >
            초기화
          </button>
        </div>

        {/* 요일 카드 */}
        <div className="flex flex-col gap-4 w-full select-none md:pb-0 sm:pb-60 pb-30">
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

      {/* 모바일 토글 헤더 - 날짜/액션 설정 */}
      {isMobile && (
        <button
          onClick={() => toggleTab("id2")}
          className="flex items-center justify-between p-4 bg-gray-200 border-b border-gray-300 hover:bg-gray-300 transition-colors"
        >
          <span className="font-medium text-gray-700">날짜 및 저장</span>
          <svg
            className={`w-5 h-5 transition-transform ${
              activeTab === "id2" ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      <div
        id="id2"
        className={`bg-gray-50 space-y-2 select-none transition-all duration-300 ${
          isMobile
            ? `border-0 ${
                activeTab === "id2"
                  ? "max-h-[calc(100vh-16rem)] p-4 overflow-y-auto"
                  : "max-h-0 p-0 overflow-hidden"
              }`
            : "border-t border-gray-300 p-4"
        }`}
      >
        <MondaySelector
          mondayDateStr={mondayDateStr}
          onDateChange={onDateChange}
        />

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

          {/* TODO: 트위터 기능 활성화 시 주석 해제 */}
          {/* <hr className="border-t-2 border-gray-300 my-4" /> */}

          {/* TODO: 트위터 기능 활성화 시 주석 해제 */}
          {/* 트위터 업로드 섹션 */}
          {/* <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              <h3 className="text-sm font-semibold text-gray-700">트위터 공유</h3>
            </div>

            {twitterStatus.isConnected ? (
              <div className="text-xs text-green-600 mb-2">
                @{twitterStatus.twitterUsername}로 연동됨
              </div>
            ) : (
              <div className="text-xs text-orange-600 mb-2">
                트위터 계정 연동이 필요합니다 (마이페이지에서 연동)
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                트윗 내용
              </label>
              <textarea
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                placeholder="시간표와 함께 공유할 내용을 입력하세요..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={3}
                maxLength={280}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {tweetText.length}/280
              </div>
            </div>

            {twitterMessage && (
              <div className={`text-xs p-2 rounded-md ${
                twitterMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {twitterMessage.text}
              </div>
            )}

            <button
              onClick={handleTwitterPreview}
              disabled={isTwitterUploading || !twitterStatus.isConnected}
              className={`w-full py-2 rounded-md text-sm font-medium transition ${
                isTwitterUploading || !twitterStatus.isConnected
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isTwitterUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  트윗 게시 중...
                </span>
              ) : (
                '트윗 미리보기'
              )}
            </button>
          </div> */}
        </div>
      </div>

      {/* TODO: 트위터 기능 활성화 시 주석 해제 */}
      {/* 트윗 미리보기 모달 */}
      {/* <TweetPreviewModal
        isOpen={showTweetModal}
        onClose={() => setShowTweetModal(false)}
        onConfirm={handleConfirmTweet}
        initialTweetText={tweetText}
        twitterUsername={twitterStatus.twitterUsername}
        isUploading={isTwitterUploading}
      /> */}
    </div>
  );
};

export default TimeTableForm;
