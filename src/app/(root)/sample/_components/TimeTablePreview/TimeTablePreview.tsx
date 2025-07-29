import TimeTableContent from "./TimeTableContent";

import { useDrag, usePinch } from "@use-gesture/react";
import React, { useCallback, useEffect, useState } from "react";
import { TDefaultCard } from "../../_settings/general";
import { TTheme } from "../../_settings/settings";

export interface TimeTablePreviewProps {
  currentTheme: TTheme;
  scale: number;
  data: TDefaultCard[];
  weekDates: Date[];
  imageSrc: string | null;
  profileText: string;
  isMobile: boolean;
  onScaleChange?: (newScale: number) => void;
}

const TimeTablePreview: React.FC<TimeTablePreviewProps> = ({
  currentTheme,
  scale,
  data,
  weekDates,
  imageSrc,
  profileText,
  isMobile,
  onScaleChange,
}) => {
  // 드래그 위치 상태
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 단순한 크기 계산 (scale 기반)
  const containerWidth = 1280 * scale;
  const containerHeight = 720 * scale;

  // 모바일에서 컨테이너 경계 계산 (useCallback으로 메모화)
  const getContainerBounds = useCallback(() => {
    if (typeof window === "undefined" || !isMobile) return null;
    
    const viewportHeight = window.innerHeight * 0.6; // 60vh
    const viewportWidth = window.innerWidth;
    
    // 이미지가 컨테이너보다 큰지 확인
    const isImageLarger = containerWidth > viewportWidth || containerHeight > viewportHeight;
    
    if (!isImageLarger) return null;
    
    // 드래그 가능한 범위 계산
    const maxX = Math.max(0, (containerWidth - viewportWidth) / 2);
    const maxY = Math.max(0, (containerHeight - viewportHeight) / 2);
    
    return {
      minX: -maxX,
      maxX: maxX,
      minY: -maxY,
      maxY: maxY,
    };
  }, [containerWidth, containerHeight, isMobile]);

  // use-gesture 드래그 핸들러 (경계 제한 포함)
  const bindDrag = useDrag(
    ({ movement: [mx, my], first, memo }) => {
      console.log("Drag event:", {
        mx,
        my,
        first,
        currentPosition: position,
      });

      // 첫 번째 드래그 시작 시 현재 위치를 memo에 저장
      if (first) {
        memo = [position.x, position.y];
        console.log("Drag started, initial position:", memo);
      }

      if (!memo) {
        memo = [0, 0]; // 안전한 기본값
      }

      // 경계 계산
      const bounds = getContainerBounds();
      
      let newX = memo[0] + mx;
      let newY = memo[1] + my;

      // 모바일에서 경계 제한 적용
      if (bounds && isMobile) {
        newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
        newY = Math.max(bounds.minY, Math.min(bounds.maxY, newY));
      }

      console.log("Movement to:", { newX, newY, bounds });

      setPosition({ x: newX, y: newY });

      return memo; // memo를 다음 호출로 전달
    },
    {
      // 드래그 감도 설정
      filterTaps: true, // 짧은 탭은 드래그로 처리하지 않음
      axis: undefined, // 모든 방향 드래그 허용
      threshold: 1, // 1px 이상 움직여야 드래그 시작
      enabled: isMobile ? getContainerBounds() !== null : true, // 드래그 가능할 때만 활성화
    }
  );

  // 핀치 줌 핸들러 (모바일에서만 활성화)
  const bindPinch = usePinch(
    ({ offset: [scale_offset] }) => {
      if (isMobile && onScaleChange) {
        const newScale = Math.min(Math.max(scale + scale_offset * 0.01, 0.1), 1.0);
        onScaleChange(newScale);
      }
    },
    {
      scaleBounds: { min: 0.1, max: 1.0 },
      rubberband: true,
    }  
  );

  // 드래그와 핀치 제스처 결합
  const bind = () => {
    const dragBindings = bindDrag();
    const pinchBindings = isMobile ? bindPinch() : {};
    
    return {
      ...dragBindings,
      ...pinchBindings,
    };
  };

  // scale이 변경될 때 위치 조정
  useEffect(() => {
    const bounds = getContainerBounds();
    if (bounds && isMobile) {
      // 현재 위치가 새로운 경계를 벗어나면 조정
      setPosition(prev => ({
        x: Math.max(bounds.minX, Math.min(bounds.maxX, prev.x)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, prev.y)),
      }));
    } else {
      // 모바일이 아니거나 이미지가 작으면 중앙으로 초기화
      setPosition({ x: 0, y: 0 });
    }
  }, [scale, isMobile, getContainerBounds]);

  // 드래그 가능 여부 계산
  const isDraggable = isMobile ? getContainerBounds() !== null : true;

  // 화면 크기 변경 시 위치 재조정
  useEffect(() => {
    const handleResize = () => {
      const bounds = getContainerBounds();
      if (bounds && isMobile) {
        setPosition(prev => ({
          x: Math.max(bounds.minX, Math.min(bounds.maxX, prev.x)),
          y: Math.max(bounds.minY, Math.min(bounds.maxY, prev.y)),
        }));
      }
    };

    if (isMobile) {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isMobile, getContainerBounds]);

  if (weekDates.length === 0) return null;
  return (
    <div 
      className="w-full overflow-hidden"
      style={{
        // 모바일에서는 고정 높이, 데스크톱에서는 flex-1
        height: isMobile ? "60vh" : "100%",
        flex: isMobile ? "none" : "1",
      }}
    >
      <div
        id={"container"}
        className="flex justify-center items-center overflow-hidden h-full pt-4 md:p-0"
      >
        <div
          id={"draggableObject"}
          className="shadow-md overflow-hidden"
          style={{
            width: containerWidth,
            height: containerHeight,
            transition: "width 0.1s, height 0.1s",
            cursor: isDraggable ? "grab" : "default",
            touchAction: "none", // 모바일에서 기본 터치 동작 방지
            position: "relative", // 포지셔닝 컨텍스트 제공
            transform: `translate(${position.x}px, ${position.y}px)`,
          }}
          {...bind()}
        >
          <TimeTableContent
            currentTheme={currentTheme}
            scale={scale}
            data={data}
            weekDates={weekDates}
            imageSrc={imageSrc}
            profileText={profileText}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeTablePreview;
