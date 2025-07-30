"use client";

import React, { createContext, ReactNode, useContext } from "react";

// Context 타입 정의
export interface TimeTableState {
  // 데이터 상태

  profileText: string;
  imageSrc: string | null;
  mondayDateStr: string;
  weekDates: Date[];

  // UI 상태
  scale: number;
  isMobile: boolean;
}

export interface TimeTableActions {
  // 데이터 액션

  updateProfileText: (text: string) => void;
  updateImageSrc: (src: string | null) => void;
  updateMondayDate: (dateStr: string) => void;

  // UI 액션
  updateScale: (scale: number) => void;
  updateIsMobile: (isMobile: boolean) => void;

  // 복합 액션
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProfileTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  handleDateChange: (dateStr: string) => void;
  downloadImage: () => void;
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
    imageSrc: state.imageSrc,

    mondayDateStr: state.mondayDateStr,
    weekDates: state.weekDates,

    updateProfileText: actions.updateProfileText,
    updateImageSrc: actions.updateImageSrc,

    updateMondayDate: actions.updateMondayDate,
    handleImageChange: actions.handleImageChange,
    handleProfileTextChange: actions.handleProfileTextChange,

    handleDateChange: actions.handleDateChange,
  };
};

export const useTimeTableUI = () => {
  const { state, actions } = useTimeTable();
  return {
    scale: state.scale,
    isMobile: state.isMobile,
    updateScale: actions.updateScale,
    updateIsMobile: actions.updateIsMobile,
  };
};

export const useTimeTableActions = () => {
  const { actions } = useTimeTable();
  return {
    downloadImage: actions.downloadImage,
  };
};
