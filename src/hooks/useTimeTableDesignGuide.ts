"use client";

import { useState, useCallback } from "react";

interface UseTimeTableDesignGuideReturn {
  isVisible: boolean;
  opacity: number;
  setVisible: (visible: boolean) => void;
  setOpacity: (opacity: number) => void;
  toggleVisible: () => void;
}

export const useTimeTableDesignGuide = (initialOpacity: number = 0.5): UseTimeTableDesignGuideReturn => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [opacity, setOpacityState] = useState<number>(initialOpacity);

  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
  }, []);

  const setOpacity = useCallback((newOpacity: number) => {
    // 0.1 ~ 1.0 범위로 제한
    const clampedOpacity = Math.max(0.1, Math.min(1.0, newOpacity));
    setOpacityState(clampedOpacity);
  }, []);

  const toggleVisible = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  return {
    isVisible,
    opacity,
    setVisible,
    setOpacity,
    toggleVisible,
  };
};