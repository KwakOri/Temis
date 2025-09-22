"use client";

import { ImageEditData, CroppedAreaPixels } from "@/types/image-edit";
import { pageAwareStorage } from "@/utils/pageAwareLocalStorage";
import { domToPng } from "modern-screenshot";
import { useEffect, useState } from "react";

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
const getInitialScale = (templateWidth?: number, templateHeight?: number) => {
  if (typeof window === "undefined") {
    return 0.5;
  }

  const isMobile = window.innerWidth < 768;

  // 템플릿 크기가 없으면 기본 배율 사용
  if (!templateWidth || !templateHeight) {
    return isMobile ? 0.3 : 0.5;
  }

  // 프리뷰 영역의 가용 크기 계산
  const availableWidth = isMobile
    ? window.innerWidth - 32 // 모바일: 좌우 패딩 고려
    : window.innerWidth * 0.75 - 64; // 데스크탑: 75% 영역에서 패딩 고려

  const availableHeight = isMobile
    ? window.innerHeight * 0.3 - 32 // 모바일: 30vh에서 패딩 고려
    : window.innerHeight - 120; // 데스크탑: 전체 높이에서 헤더/패딩 고려

  // 가로/세로 비율 중 더 제한적인 것 기준으로 배율 계산
  const scaleByWidth = availableWidth / templateWidth;
  const scaleByHeight = availableHeight / templateHeight;
  const calculatedScale = Math.min(scaleByWidth, scaleByHeight);

  // 최소 0.1, 최대 1.0으로 제한
  const clampedScale = Math.max(0.1, Math.min(calculatedScale, 1.0));

  return clampedScale;
};

export const useTimeTableState = (captureSize?: {
  width: number;
  height: number;
}) => {
  const [profileText, setProfileText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("profileText", "");
    }
    return "";
  });
  const [memoText, setMemoText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("memoText", "");
    }
    return "";
  });
  const [imageSrc, setImageSrc] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("imageSrc", null);
    }
    return null;
  });
  const [isProfileTextVisible, setIsProfileTextVisible] = useState<boolean>(
    () => {
      if (typeof window !== "undefined") {
        return pageAwareStorage.getItem("isProfileTextVisible", true);
      }
      return true;
    }
  );
  const [isMemoTextVisible, setIsMemoTextVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("isMemoTextVisible", true);
    }
    return true;
  });
  
  // 이미지 편집 데이터 상태
  const [imageEditData, setImageEditData] = useState<ImageEditData | null>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("imageEditData", null);
    }
    return null;
  });

  const [mondayDateStr, setMondayDateStr] = useState<string>(
    getDefaultMondayString()
  );
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // UI 상태
  const [scale, setScale] = useState(() =>
    getInitialScale(captureSize?.width, captureSize?.height)
  );
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
      pageAwareStorage.setItem("memoText", memoText);
    }
  }, [memoText]);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("isMemoTextVisible", isMemoTextVisible);
    }
  }, [isMemoTextVisible]);

  // imageEditData 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (imageEditData) {
        pageAwareStorage.setItem("imageEditData", imageEditData);
      } else {
        pageAwareStorage.removeItem("imageEditData");
      }
    }
  }, [imageEditData]);

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
  // 창 크기 변경 시 배율 재계산
  useEffect(() => {
    const handleResize = () => {
      const isCurrentlyMobile = window.innerWidth < 768;
      setIsMobile(isCurrentlyMobile);

      // 창 크기에 맞춰 최적 배율 재계산
      const newOptimalScale = getInitialScale(
        captureSize?.width,
        captureSize?.height
      );

      // 현재 배율이 기본값들 중 하나인 경우에만 자동 조정
      // (사용자가 수동으로 조정한 배율은 유지)
      const defaultScales = [0.3, 0.5, 1.0];
      if (
        defaultScales.some((s) => Math.abs(scale - s) < 0.05) ||
        scale > 1.0
      ) {
        setScale(Math.min(newOptimalScale, isCurrentlyMobile ? 1.0 : 2.0));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scale, captureSize]);

  // 액션 함수들
  const actions = {
    // 기본 업데이트 함수들
    updateProfileText: (text: string) => setProfileText(text),
    updateMemoText: (text: string) => setMemoText(text),
    updateImageSrc: (src: string | null) => setImageSrc(src),
    updateMondayDate: (dateStr: string) => setMondayDateStr(dateStr),
    updateScale: (newScale: number) => setScale(newScale),
    updateIsMobile: (mobile: boolean) => setIsMobile(mobile),
    updateIsProfileTextVisible: (visible: boolean) =>
      setIsProfileTextVisible(visible),
    updateIsMemoTextVisible: (visible: boolean) =>
      setIsMemoTextVisible(visible),

    // 복합 액션 함수들
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // PNG 파일인지 확인
      const isPNG = file.type === 'image/png';

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;

        if (isPNG) {
          // PNG 파일인 경우 그대로 저장 (투명도 보존)
          setImageSrc(result);
        } else {
          // PNG가 아닌 경우에만 canvas를 사용해서 변환
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              setImageSrc(result);
              return;
            }

            canvas.width = img.width;
            canvas.height = img.height;

            // 투명 배경 설정
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // PNG 형식으로 변환 (투명도 보존)
            const pngDataUrl = canvas.toDataURL('image/png');
            setImageSrc(pngDataUrl);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    },

    handleProfileTextChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      setProfileText(newText);
    },
    handleMemoTextChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      setMemoText(newText);
    },

    handleDateChange: (dateStr: string) => {
      setMondayDateStr(dateStr);
    },

    toggleProfileTextVisible: () => {
      setIsProfileTextVisible((prev) => !prev);
    },
    turnOnProfileTextVisible: () => {
      setIsProfileTextVisible(true);
    },
    turnOffProfileTextVisible: () => {
      setIsProfileTextVisible(false);
    },

    toggleMemoTextVisible: () => {
      setIsMemoTextVisible((prev) => !prev);
    },
    turnOnMemoTextVisible: () => {
      setIsMemoTextVisible(true);
    },
    turnOffMemoTextVisible: () => {
      setIsMemoTextVisible(false);
    },

    // 이미지 편집 액션 함수들
    updateImageEditData: (data: Partial<ImageEditData>) => {
      setImageEditData(prev => prev ? { ...prev, ...data } : null);
    },

    setOriginalImage: (imageSrc: string, cropWidth = 400, cropHeight = 400) => {
      const newImageEditData: ImageEditData = {
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        originalImageSrc: imageSrc,
        croppedImageSrc: null,
        cropWidth,
        cropHeight,
        aspectRatio: cropWidth / cropHeight,
      };
      setImageEditData(newImageEditData);
    },

    saveCroppedImage: (croppedImageSrc: string, croppedAreaPixels: CroppedAreaPixels) => {
      setImageEditData(prev => 
        prev ? { 
          ...prev, 
          croppedImageSrc, 
          croppedAreaPixels
        } : null
      );
    },

    updateEditProgress: (crop: { x: number; y: number }, zoom: number, rotation: number) => {
      setImageEditData(prev => 
        prev ? { 
          ...prev, 
          crop,
          zoom,
          rotation
        } : null
      );
    },

    resetImageEditData: () => {
      setImageEditData(null);
    },

    startEditMode: (): ImageEditData | null => {
      return imageEditData;
    },

    downloadImage: async (targetWidth: number, targetHeight: number) => {
      const node = document.getElementById("timetable");
      if (!node) return;

      try {
        // 현재 시간을 기반으로 파일명 생성
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const fileName = `timetable_${year}${month}${day}${hours}${minutes}${seconds}_${targetWidth}x${targetHeight}.png`;

        // 원본 템플릿 크기 사용
        const templateWidth = captureSize?.width || 1280;
        const templateHeight = captureSize?.height || 720;

        // 현재 스케일 임시 저장 및 원본 크기로 복원
        const originalTransform = node.style.transform;
        const originalWidth = node.style.width;
        const originalHeight = node.style.height;

        // 캡처를 위해 원본 크기로 설정 (스케일 제거)
        node.style.transform = "scale(1)";
        node.style.width = `${templateWidth}px`;
        node.style.height = `${templateHeight}px`;
        node.style.transformOrigin = "top left";

        // 폰트와 이미지 로딩 대기
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 원본 사이즈로 캡처
        const originalDataUrl = await domToPng(node, {
          width: templateWidth,
          height: templateHeight,
          quality: 1,
          backgroundColor: "transparent",
        });

        // 원래 스타일 복원
        node.style.transform = originalTransform;
        node.style.width = originalWidth;
        node.style.height = originalHeight;

        // 캡처된 이미지를 타겟 크기로 리사이징
        if (targetWidth === templateWidth && targetHeight === templateHeight) {
          // 원본 크기와 같은 경우 원본 그대로 다운로드
          const link = document.createElement("a");
          link.download = fileName;
          link.href = originalDataUrl;
          link.click();
        } else {
          // 리사이징이 필요한 경우
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) return;

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // 고품질 리샘플링 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // 타겟 크기로 리사이징된 이미지 그리기
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // 리사이징된 이미지를 다운로드
            canvas.toBlob(
              (blob) => {
                if (!blob) return;

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.download = fileName;
                link.href = url;
                link.click();

                // 메모리 정리
                URL.revokeObjectURL(url);
              },
              "image/png",
              1
            );
          };

          img.src = originalDataUrl;
        }
      } catch (err) {
        console.error("이미지 생성 실패:", err);
        // 에러 발생 시 원래 스타일 복원
        const node = document.getElementById("timetable");
        if (node) {
          node.style.transform = `scale(${scale})`;
          node.style.width = "";
          node.style.height = "";
        }
      }
    },
  };

  // 상태와 액션 반환
  const state = {
    profileText,
    memoText,
    imageSrc,
    imageEditData,
    mondayDateStr,
    weekDates,
    scale,
    isMobile,
    isProfileTextVisible,
    isMemoTextVisible,
    captureSize,
  };

  return { state, actions };
};
