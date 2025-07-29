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


  // use-gesture 드래그 핸들러 (자유 드래그)
  const bindDrag = useDrag(
    ({ movement: [mx, my], first, memo }) => {
      // 첫 번째 드래그 시작 시 현재 위치를 memo에 저장
      if (first) {
        memo = [position.x, position.y];
      }

      if (!memo) {
        memo = [0, 0]; // 안전한 기본값
      }

      // 새로운 위치 계산 (경계 제한 없음)
      const newX = memo[0] + mx;
      const newY = memo[1] + my;

      setPosition({ x: newX, y: newY });

      return memo; // memo를 다음 호출로 전달
    },
    {
      // 드래그 감도 설정
      filterTaps: true, // 짧은 탭은 드래그로 처리하지 않음
      axis: undefined, // 모든 방향 드래그 허용
      threshold: 1, // 1px 이상 움직여야 드래그 시작
      enabled: true, // 항상 드래그 허용
    }
  );

  // 핀치 줌 핸들러 (모바일에서만 활성화)
  const bindPinch = usePinch(
    ({ offset: [scale_offset] }) => {
      if (isMobile && onScaleChange) {
        const newScale = Math.min(
          Math.max(scale + scale_offset * 0.01, 0.1),
          1.0
        );
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

  // scale이 변경될 때 위치 초기화 (데스크톱만)
  useEffect(() => {
    if (!isMobile) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale, isMobile]);

  // 드래그 가능 여부 계산
  const isDraggable = true;

  // 화면 크기 변경 시 위치 초기화 (모바일)
  useEffect(() => {
    const handleResize = () => {
      if (isMobile) {
        setPosition({ x: 0, y: 0 });
      }
    };

    if (isMobile) {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isMobile]);

  // 스타일 계산 함수들
  const getViewportStyle = () => ({
    height: isMobile ? "30vh" : "100%",
    flex: isMobile ? "none" : "1",
  });

  const getDraggableStyle = () => ({
    width: containerWidth,
    height: containerHeight,
    transform: `translate(${position.x}px, ${position.y}px)`,
    cursor: isDraggable ? "grab" : "default",
    transition: "width 0.1s ease, height 0.1s ease",
    touchAction: "none",
  });

  if (weekDates.length === 0) return null;

  return (
    // 뷰포트 컨테이너 - 전체 영역 정의
    <div className="w-full overflow-hidden" style={getViewportStyle()}>
      {/* 프리뷰 컨테이너 - 중앙 정렬 및 패딩 */}
      <div className="flex justify-center items-center h-full overflow-hidden pt-4 md:p-0">
        {/* 드래그 가능한 시간표 */}
        <div
          className="relative shadow-lg rounded-sm"
          style={getDraggableStyle()}
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
