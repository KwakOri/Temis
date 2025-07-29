import Loading from "@/components/Loading";
import { domToPng } from "modern-screenshot";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { defaultCards, TDefaultCard } from "../_settings/general";
import { defaultTheme, TTheme } from "../_settings/settings";
import {
  loadProfileText,
  loadTheme,
  loadTimeTableData,
  saveProfileText,
  saveTheme,
  saveTimeTableData,
} from "../_utils/localStorage";
import TimeTableControls from "./TimeTableControls";
import TimeTableForm from "./TimeTableForm";
import TimeTablePreview from "./TimeTablePreview";

const getDefaultMondayString = (): string => {
  const today = new Date();
  const day = today.getDay(); // 0 (Sun) ~ 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
};

const TimeTableEditor: React.FC = () => {
  // 모바일에서는 더 작은 초기 scale 사용
  const getInitialScale = () => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768 ? 0.3 : 0.5;
    }
    return 0.5;
  };

  const [scale, setScale] = useState(getInitialScale());
  const [data, setData] = useState<TDefaultCard[]>(defaultCards);

  const [profileText, setProfileText] = useState<string>("");

  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const [currentTheme, setCurrentTheme] = useState<TTheme>(defaultTheme);

  const [mondayDateStr, setMondayDateStr] = useState<string>(
    getDefaultMondayString()
  );
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // 모바일 상태 관리
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const onProfileTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setProfileText(newText);
    saveProfileText(newText);
  };

  const getThisWeekDatesFromMonday = (monday: Date): Date[] => {
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  };

  const handleDateChange = (dateStr: string) => {
    setMondayDateStr(dateStr);
  };

  const onThemeButtonClick = (value: TTheme) => {
    setCurrentTheme(value);
    saveTheme(value);
  };

  useEffect(() => {
    const monday = new Date(mondayDateStr);
    setWeekDates(getThisWeekDatesFromMonday(monday));
  }, [mondayDateStr]);

  // localStorage에서 데이터 로드하는 useEffect
  useEffect(() => {
    // 시간표 데이터 로드
    const savedData = loadTimeTableData();
    if (savedData) {
      setData(savedData);
    }

    // 테마 로드
    const savedTheme = loadTheme();
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    }

    // 작가명 로드
    const savedProfileText = loadProfileText();
    if (savedProfileText) {
      setProfileText(savedProfileText);
    }

    // 기본 월요일 날짜 설정
    const getDefaultMondayString = (): string => {
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday + 1);
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split("T")[0];
    };

    setMondayDateStr(getDefaultMondayString());
  }, []);

  // data 변경 시 localStorage에 저장
  useEffect(() => {
    saveTimeTableData(data);
  }, [data]);

  // 화면 크기 변경 시 scale 조정 및 isMobile 상태 업데이트
  useEffect(() => {
    const handleResize = () => {
      const isCurrentlyMobile = window.innerWidth < 768;
      setIsMobile(isCurrentlyMobile);

      // 모바일에서 최대 배율 제한만 적용
      if (isCurrentlyMobile && scale > 1.0) {
        setScale(1.0);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scale]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const downloadImage = () => {
    const node = document.getElementById("timetable");
    if (!node) return;

    // 현재 시간을 기반으로 파일명 생성 (YYYYMMDDHHMMSS)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const fileName = `timetable_${year}${month}${day}${hours}${minutes}${seconds}.png`;

    domToPng(node, {
      width: 1280,
      height: 720,
      scale: 1,
      style: {
        transform: "scale(1)",
        transformOrigin: "top left",
      },
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();

        // 이미지 다운로드 완료 후 페이지 새로고침
        // setTimeout(() => {
        //   window.location.reload();
        // }, 500);
        // 500ms 지연 후 새로고침 (다운로드 완료를 위한 여유시간)
      })
      .catch((err) => {
        console.error("이미지 생성 실패:", err);
      });
  };

  if (weekDates.length === 0) return <Loading />;

  return (
    <div className="w-full h-full flex flex-col">
      {/* 데스크탑 버전 - TimeTableControls (뒤로가기 + 배율 조절 통합) */}
      {!isMobile && (
        <TimeTableControls scale={scale} onScaleChange={setScale} />
      )}

      {/* 모바일 버전 - 상단 헤더에 뒤로가기 + 배율 조절 */}
      {isMobile && (
        <div className="sticky top-0 flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
          {/* 뒤로가기 버튼 */}
          <Link
            href="/"
            className="flex items-center text-gray-600 active:text-gray-900 transition-colors touch-manipulation"
          >
            <svg
              className="w-6 h-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">뒤로가기</span>
          </Link>

          {/* 배율 조절 */}
          <div className="flex items-center gap-2">
            {/* <button
              onClick={() => setScale(Math.max(0.1, scale - 0.1))}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 active:bg-gray-300 transition-colors touch-manipulation"
              disabled={scale <= 0.1}
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
                  d="M20 12H4"
                />
              </svg>
            </button> */}

            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {Math.round(scale * 100)}%
              </span>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-24 h-3 rounded-lg appearance-none bg-gray-300
                accent-[#3E4A82]
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[#3E4A82]
                [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-[#3E4A82]
                [&::-moz-range-thumb]:shadow-md
                [&::-moz-range-thumb]:cursor-pointer
                [&::-moz-range-thumb]:border-none
                "
              />
            </div>

            {/* <button
              onClick={() => setScale(Math.min(1.0, scale + 0.1))}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 active:bg-gray-300 transition-colors touch-manipulation"
              disabled={scale >= 1.0}
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button> */}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center min-h-0 gap-0">
        <TimeTablePreview
          currentTheme={currentTheme}
          profileText={profileText}
          scale={scale}
          data={data}
          weekDates={weekDates}
          imageSrc={imageSrc}
          isMobile={isMobile}
          onScaleChange={setScale}
        />

        <TimeTableForm
          currentTheme={currentTheme}
          onThemeButtonClick={onThemeButtonClick}
          profileText={profileText}
          onProfileTextChange={onProfileTextChange}
          data={data}
          setData={setData}
          setProfileText={setProfileText}
          onImageChange={handleImageChange}
          mondayDateStr={mondayDateStr}
          onDateChange={handleDateChange}
          onDownloadClick={downloadImage}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};

export default TimeTableEditor;
