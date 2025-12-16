"use client";

import { OptionType } from "@/hooks/useTimeTableState";
import { CroppedAreaPixels, ImageEditData } from "@/types/image-edit";
import React, { createContext, ReactNode, useContext } from "react";

// Context 타입 정의
export interface TimeTableState {
  // 데이터 상태

  profileText: string;
  memoText: string;
  imageSrc: string | null;
  mondayDateStr: string;
  weekDates: Date[];

  // 이미지 편집 상태
  imageEditData: ImageEditData | null;

  // UI 상태
  scale: number;
  isMobile: boolean;
  isProfileTextVisible: boolean;
  isMemoTextVisible: boolean;

  // 옵션 버튼 상태
  selectedOptions: OptionType[];

  // 템플릿 설정
  captureSize: { width: number; height: number } | undefined;
}

export interface TimeTableActions {
  // 데이터 액션

  updateProfileText: (text: string) => void;
  updateMemoText: (text: string) => void;
  updateImageSrc: (src: string | null) => void;
  updateMondayDate: (dateStr: string) => void;

  // 이미지 편집 액션
  updateImageEditData: (data: Partial<ImageEditData>) => void;
  setOriginalImage: (
    imageSrc: string,
    cropWidth?: number,
    cropHeight?: number
  ) => void;
  saveCroppedImage: (
    croppedImageSrc: string,
    croppedAreaPixels: CroppedAreaPixels
  ) => void;
  updateEditProgress: (
    crop: { x: number; y: number },
    zoom: number,
    rotation: number
  ) => void;
  resetImageEditData: () => void;
  startEditMode: () => ImageEditData | null;

  // UI 액션
  updateScale: (scale: number) => void;
  updateIsMobile: (isMobile: boolean) => void;
  updateIsProfileTextVisible: (visible: boolean) => void;

  // 복합 액션
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProfileTextChange: (text: string) => void;
  handleMemoTextChange: (text: string) => void;

  handleDateChange: (dateStr: string) => void;

  // 옵션 버튼 관리 액션
  handleOptionClick: (option: OptionType, multiSelect?: boolean) => void;

  downloadImage: (targetWidth: number, targetHeight: number) => Promise<void>;
}

export interface TimeTableContextType {
  state: TimeTableState;
  actions: TimeTableActions;
}

// Context 생성
const TimeTableContext = createContext<TimeTableContextType | undefined>(
  undefined
);

// Context Provider Props
interface TimeTableProviderProps {
  children: ReactNode;
  value: TimeTableContextType;
}

// Context Provider 컴포넌트
export const TimeTableProvider: React.FC<TimeTableProviderProps> = ({
  children,
  value,
}) => {
  return (
    <TimeTableContext.Provider value={value}>
      {children}
    </TimeTableContext.Provider>
  );
};

// Context Hook
export const useTimeTable = (): TimeTableContextType => {
  const context = useContext(TimeTableContext);
  if (!context) {
    throw new Error("useTimeTable must be used within a TimeTableProvider");
  }
  return context;
};

// 각 영역별 선택적 Hook들
export const useTimeTableData = () => {
  const { state, actions } = useTimeTable();
  return {
    profileText: state.profileText,
    memoText: state.memoText,
    imageSrc: state.imageSrc,
    isProfileTextVisible: state.isProfileTextVisible,
    isMemoTextVisible: state.isMemoTextVisible,
    selectedOptions: state.selectedOptions,

    mondayDateStr: state.mondayDateStr,
    weekDates: state.weekDates,

    updateProfileText: actions.updateProfileText,
    updateImageSrc: actions.updateImageSrc,
    updateIsProfileTextVisible: actions.updateIsProfileTextVisible,

    updateMondayDate: actions.updateMondayDate,
    handleImageChange: actions.handleImageChange,
    handleProfileTextChange: actions.handleProfileTextChange,

    handleDateChange: actions.handleDateChange,
    handleOptionClick: actions.handleOptionClick,
  };
};

export const useTimeTableUI = () => {
  const { state, actions } = useTimeTable();
  return {
    scale: state.scale,
    isMobile: state.isMobile,
    isProfileTextVisible: state.isProfileTextVisible,
    isMemoTextVisible: state.isMemoTextVisible,
    selectedOptions: state.selectedOptions,
    updateScale: actions.updateScale,
    updateIsMobile: actions.updateIsMobile,
    updateIsProfileTextVisible: actions.updateIsProfileTextVisible,
    handleOptionClick: actions.handleOptionClick,
  };
};

export const useTimeTableActions = () => {
  const { actions } = useTimeTable();
  return {
    downloadImage: actions.downloadImage,
  };
};
