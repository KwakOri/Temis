"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useTimeTableDesignGuide } from "@/hooks/useTimeTableDesignGuide";

interface TimeTableDesignGuideContextType {
  isVisible: boolean;
  opacity: number;
  setVisible: (visible: boolean) => void;
  setOpacity: (opacity: number) => void;
  toggleVisible: () => void;
}

const TimeTableDesignGuideContext = createContext<TimeTableDesignGuideContextType | undefined>(undefined);

interface TimeTableDesignGuideProviderProps {
  children: ReactNode;
}

export const TimeTableDesignGuideProvider: React.FC<TimeTableDesignGuideProviderProps> = ({ children }) => {
  const designGuideState = useTimeTableDesignGuide(0.5);

  return (
    <TimeTableDesignGuideContext.Provider value={designGuideState}>
      {children}
    </TimeTableDesignGuideContext.Provider>
  );
};

export const useTimeTableDesignGuideContext = (): TimeTableDesignGuideContextType => {
  const context = useContext(TimeTableDesignGuideContext);
  if (context === undefined) {
    throw new Error('useTimeTableDesignGuideContext must be used within a TimeTableDesignGuideProvider');
  }
  return context;
};