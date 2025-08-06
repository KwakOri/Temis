"use client";

import { domToPng } from "modern-screenshot";
import { useEffect, useState } from "react";
import { pageAwareStorage } from "@/utils/pageAwareLocalStorage";

// 기본 월요일 날짜 계산 함수
const getDefaultMondayString = (): string => {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
};

// 주간 날짜 배열 생성 함수
const getThisWeekDatesFromMonday = (monday: Date): Date[] => {
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
};

// 초기 스케일 계산 함수
const getInitialScale = () => {
  if (typeof window !== "undefined") {
    return window.innerWidth < 768 ? 0.3 : 0.5;
  }
  return 0.5;
};

export const useTimeTableState = () => {
  const [profileText, setProfileText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("profileText", "");
    }
    return "";
  });
  const [imageSrc, setImageSrc] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("imageSrc", null);
    }
    return null;
  });
  const [isProfileTextVisible, setIsProfileTextVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("isProfileTextVisible", true);
    }
    return true;
  });

  const [mondayDateStr, setMondayDateStr] = useState<string>(
    getDefaultMondayString()
  );
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // UI 상태
  const [scale, setScale] = useState(getInitialScale());
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // 주간 날짜 업데이트
  useEffect(() => {
    const monday = new Date(mondayDateStr);
    setWeekDates(getThisWeekDatesFromMonday(monday));
  }, [mondayDateStr]);

  // profileText 또는 imageSrc 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("profileText", profileText);
    }
  }, [profileText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (imageSrc) {
        pageAwareStorage.setItem("imageSrc", imageSrc);
      } else {
        pageAwareStorage.removeItem("imageSrc");
      }
    }
  }, [imageSrc]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("isProfileTextVisible", isProfileTextVisible);
    }
  }, [isProfileTextVisible]);

  // localStorage에서 데이터 로드
  useEffect(() => {
    // 기본 월요일 날짜 재설정
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

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      const isCurrentlyMobile = window.innerWidth < 768;
      setIsMobile(isCurrentlyMobile);

      if (isCurrentlyMobile && scale > 1.0) {
        setScale(1.0);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scale]);

  // 액션 함수들
  const actions = {
    // 기본 업데이트 함수들
    updateProfileText: (text: string) => setProfileText(text),
    updateImageSrc: (src: string | null) => setImageSrc(src),
    updateMondayDate: (dateStr: string) => setMondayDateStr(dateStr),
    updateScale: (newScale: number) => setScale(newScale),
    updateIsMobile: (mobile: boolean) => setIsMobile(mobile),
    updateIsProfileTextVisible: (visible: boolean) => setIsProfileTextVisible(visible),

    // 복합 액션 함수들
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    },

    handleProfileTextChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      setProfileText(newText);
    },

    handleDateChange: (dateStr: string) => {
      setMondayDateStr(dateStr);
    },

    toggleProfileTextVisible: () => {
      setIsProfileTextVisible(prev => !prev);
    },

    downloadImage: () => {
      const node = document.getElementById("timetable");
      if (!node) return;

      // 현재 시간을 기반으로 파일명 생성
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
        })
        .catch((err) => {
          console.error("이미지 생성 실패:", err);
        });
    },
  };

  // 상태와 액션 반환
  const state = {
    profileText,
    imageSrc,
    mondayDateStr,
    weekDates,
    scale,
    isMobile,
    isProfileTextVisible,
  };

  return { state, actions };
};
