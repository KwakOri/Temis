"use client";

import React, { useState } from "react";
import { useDrag } from "@use-gesture/react";

const DragSamplePage = () => {
  // 드래그 위치 상태
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // 드래그 핸들러 설정
  const bind = useDrag(
    // 드래그 이벤트 콜백 함수
    ({ movement: [mx, my], first, memo }) => {
      console.log("드래그 이벤트:", { mx, my, first });
      
      // 첫 번째 드래그 시작 시 현재 위치를 memo에 저장
      if (first) {
        memo = [position.x, position.y];
        console.log("드래그 시작 위치:", memo);
      }
      
      // memo가 없으면 기본값 설정
      if (!memo) {
        memo = [0, 0];
      }
      
      // 새로운 위치 계산 (시작 위치 + 움직인 거리)
      const newX = memo[0] + mx;
      const newY = memo[1] + my;
      
      console.log("새로운 위치:", { newX, newY });
      
      // 위치 업데이트
      setPosition({ x: newX, y: newY });
      
      // memo를 다음 호출로 전달
      return memo;
    },
    {
      // 드래그 설정
      filterTaps: true,    // 짧은 탭은 드래그로 처리하지 않음
      axis: undefined,     // 모든 방향 드래그 허용 (x축만: 'x', y축만: 'y')
      threshold: 1,        // 1px 이상 움직여야 드래그 시작
    }
  );

  // 위치 초기화 함수
  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">드래그 예제</h1>
        
        {/* 설명 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">사용법:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>데스크탑:</strong> 빨간 박스를 마우스로 클릭하고 드래그</li>
            <li><strong>모바일:</strong> 빨간 박스를 터치하고 드래그</li>
            <li>박스가 움직이는 것을 확인하세요</li>
            <li>초기화 버튼으로 원래 위치로 돌아갑니다</li>
          </ul>
        </div>

        {/* 현재 위치 표시 */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-8">
          <h3 className="text-lg font-semibold mb-2">현재 위치:</h3>
          <p className="text-gray-700">
            X: {position.x.toFixed(0)}px, Y: {position.y.toFixed(0)}px
          </p>
        </div>

        {/* 드래그 컨테이너 */}
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">드래그 영역:</h3>
          
          {/* 드래그 가능한 박스 */}
          <div
            className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
            style={{ 
              height: "400px",
              overflow: "hidden" // 컨테이너 밖으로 나가지 않도록
            }}
          >
            <div
              // use-gesture의 bind 함수를 스프레드로 적용
              {...bind()}
              className="absolute w-20 h-20 bg-red-500 rounded-lg shadow-lg flex items-center justify-center text-white font-bold cursor-grab active:cursor-grabbing select-none"
              style={{
                // transform으로 위치 이동
                transform: `translate(${position.x}px, ${position.y}px)`,
                // 모바일에서 기본 터치 동작 방지
                touchAction: "none",
                // 드래그 중 텍스트 선택 방지
                userSelect: "none",
              }}
            >
              드래그
            </div>
          </div>

          {/* 초기화 버튼 */}
          <button
            onClick={resetPosition}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            위치 초기화
          </button>
        </div>

        {/* 코드 설명 */}
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
          <h3 className="text-lg font-semibold mb-4">핵심 코드 설명:</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>1. useDrag 훅:</strong> @use-gesture/react에서 제공하는 드래그 기능</p>
            <p><strong>2. movement:</strong> [mx, my] - 드래그 시작점으로부터의 이동 거리</p>
            <p><strong>3. first:</strong> 드래그가 시작되는 첫 번째 호출인지 확인</p>
            <p><strong>4. memo:</strong> 드래그 시작 위치를 기억하는 변수</p>
            <p><strong>5. {`{...bind()}`}:</strong> 드래그 이벤트를 엘리먼트에 바인딩</p>
            <p><strong>6. touchAction: &apos;none&apos;:</strong> 모바일에서 스크롤 등 기본 터치 동작 방지</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragSamplePage;