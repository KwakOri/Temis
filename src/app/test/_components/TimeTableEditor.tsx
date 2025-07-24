import {
  Data,
  ThemeTypes,
} from "@/app/test/_components/TimeTablePreview/types";

import TimeTableControls from "@/app/test/_components/TimeTableControls";
import TimeTableForm from "@/app/test/_components/TimeTableForm";
import * as htmlToImage from "html-to-image";
import React, { useEffect, useState, type ChangeEvent } from "react";
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
  const [scale, setScale] = useState(0.5);
  const [data, setData] = useState<Data[]>([
    {
      day: 0,
      isHoliday: false,
      time: "09:00",
      topic: "소제목 적는 곳",
      description: "내용 적는 곳",
    },
    {
      day: 1,
      isHoliday: false,
      time: "09:00",
      topic: "소제목 적는 곳",
      description: "내용 적는 곳",
    },
    {
      day: 2,
      isHoliday: false,
      time: "09:00",
      topic: "소제목 적는 곳",
      description: "내용 적는 곳",
    },
    {
      day: 3,
      isHoliday: false,
      time: "09:00",
      topic: "소제목 적는 곳",
      description: "내용 적는 곳",
    },
    {
      day: 4,
      isHoliday: false,
      time: "09:00",
      topic: "소제목 적는 곳",
      description: "내용 적는 곳",
    },
    {
      day: 5,
      isHoliday: false,
      time: "09:00",
      topic: "소제목 적는 곳",
      description: "내용 적는 곳",
    },
    {
      day: 6,
      isHoliday: false,
      time: "09:00",
      topic: "소제목 적는 곳",
      description: "내용 적는 곳",
    },
  ]);

  const [profileText, setProfileText] = useState<string>("아티스트");

  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const [currentTheme, setCurrentTheme] = useState<ThemeTypes>("blue");

  const [mondayDateStr, setMondayDateStr] = useState<string>(
    getDefaultMondayString()
  );
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  const onProfileTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileText(e.target.value);
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

  const onThemeButtonClick = (value: ThemeTypes) => {
    setCurrentTheme(value);
  };

  useEffect(() => {
    const monday = new Date(mondayDateStr);
    setWeekDates(getThisWeekDatesFromMonday(monday));
  }, [mondayDateStr]);

  useEffect(() => {
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

    htmlToImage
      .toPng(node, {
        width: 1280,
        height: 720,
        pixelRatio: 1,
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
      })
      .catch((err) => {
        console.error("이미지 생성 실패:", err);
      });
  };

  return (
    <div className="w-full h-full flex flex-col">
      <TimeTableControls
        scale={scale}
        onScaleChange={setScale}
        mondayDateStr={mondayDateStr}
        onDateChange={handleChange}
        onDownloadClick={downloadImage}
      />
      <div className="flex items-center flex-1 min-h-0">
        <TimeTablePreview
          currentTheme={currentTheme}
          profileText={profileText}
          scale={scale}
          data={data}
          weekDates={weekDates}
          imageSrc={imageSrc}
        />
        <TimeTableForm
          currentTheme={currentTheme}
          onThemeButtonClick={onThemeButtonClick}
          profileText={profileText}
          onProfileTextChange={onProfileTextChange}
          data={data}
          setData={setData}
          onImageChange={handleImageChange}
        />
      </div>
    </div>
  );
};

export default TimeTableEditor;
