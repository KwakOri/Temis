import { domToPng } from "modern-screenshot";
import React, { useEffect, useState, type ChangeEvent } from "react";
import Loading from "../../../components/Loading/Loading";
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
      return window.innerWidth < 768 ? 0.25 : 0.5;
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

  const isMonday = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    return date.getDay() === 1;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.value;
    if (isMonday(selected)) {
      setMondayDateStr(selected);
    } else {
      alert("⚠️ 선택한 날짜는 월요일이 아닙니다. 월요일만 선택 가능합니다.");
    }
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

      const newScale = isCurrentlyMobile ? 0.25 : 0.5;
      if (scale > newScale && isCurrentlyMobile) {
        setScale(newScale);
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
        link.download = "weekly-timetable.png";
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
      <TimeTableControls scale={scale} onScaleChange={setScale} />
      <div className="flex flex-col md:flex-row md:items-center flex-1 min-h-0 gap-4 md:gap-0">
        <TimeTablePreview
          currentTheme={currentTheme}
          profileText={profileText}
          scale={scale}
          data={data}
          weekDates={weekDates}
          imageSrc={imageSrc}
          isMobile={isMobile}
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
          onDateChange={handleChange}
          onDownloadClick={downloadImage}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};

export default TimeTableEditor;
