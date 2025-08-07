"use client";

import { splitOddEven } from "@/utils/utils";
import { useEffect, useState } from "react";
import ThumbnailCard from "./ThumbnailCard";

interface PortfolioGalleryProps {
  totalItems: number;
  speedPxPerSecond?: number;
}

// 브라우저 크기별 카드 크기 설정 (기본 크기 유지, 대형 화면에서 점진적 확대)
const getCardSizeByViewport = (windowWidth: number) => {
  if (windowWidth >= 3840) { // 4K+ 디스플레이 (2.5배 확대)
    return { cardWidth: 750, gap: 40, cardHeight: 500 };
  } else if (windowWidth >= 2560) { // QHD+ 디스플레이 (2.0배 확대)
    return { cardWidth: 600, gap: 32, cardHeight: 400 };
  } else if (windowWidth >= 1920) { // FHD+ 디스플레이 (1.6배 확대)
    return { cardWidth: 480, gap: 26, cardHeight: 320 };
  } else if (windowWidth >= 1440) { // HD+ 디스플레이 (1.3배 확대)
    return { cardWidth: 390, gap: 21, cardHeight: 260 };
  } else if (windowWidth >= 1024) { // 태블릿 가로 (1.1배 확대)
    return { cardWidth: 330, gap: 18, cardHeight: 220 };
  } else if (windowWidth >= 768) { // 태블릿 세로 (기본 크기)
    return { cardWidth: 300, gap: 16, cardHeight: 200 };
  } else { // 모바일 (축소)
    return { cardWidth: 250, gap: 12, cardHeight: 167 };
  }
};

// 기본 카드 크기 (SSR에서 사용)
const defaultCardSize = { cardWidth: 300, gap: 16, cardHeight: 200 };

const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  totalItems,
  speedPxPerSecond = 50,
}) => {
  const [odd, even] = splitOddEven(totalItems);
  const [cardSize, setCardSize] = useState(defaultCardSize);
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 마운트 후 실제 브라우저 크기로 업데이트
  useEffect(() => {
    setIsClient(true);
    const initialSize = getCardSizeByViewport(window.innerWidth);
    setCardSize(initialSize);

    const handleResize = () => {
      const newCardSize = getCardSizeByViewport(window.innerWidth);
      setCardSize(newCardSize);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 카드 폭 + 간격을 기준으로 애니메이션 duration 계산
  const CARD_WITH_GAP = cardSize.cardWidth + cardSize.gap;

  // 각 배열의 총 폭 계산하여 duration 결정
  const oddDuration = (odd.length * 2 * CARD_WITH_GAP) / speedPxPerSecond;
  const evenDuration = (even.length * 2 * CARD_WITH_GAP) / speedPxPerSecond;

  return (
    <section className="pb-20 pt-8 px-4 text-center bg-white">
      <h2 className="text-2xl font-bold mb-8">작업물 포트폴리오</h2>
      <div className="mx-auto space-y-6 gallery-container">
        {/* 첫 번째 슬라이드 - 홀수 */}
        <div className="overflow-x-hidden scrollbar-hidden">
          <div
            className="flex w-max pointer-events-none transform-gpu transition-all duration-300 ease-out"
            style={{
              height: `${cardSize.cardHeight + 20}px`, // 카드 높이 + 여백
              gap: `${cardSize.gap}px`,
              animation: isClient ? `slideLoop ${oddDuration}s linear infinite` : 'none',
            }}
          >
            {Array(2) // 고정된 2배 복제로 부드러운 루프 구현
              .fill(0)
              .flatMap((_, groupIdx) =>
                odd.map((id) => (
                  <div
                    key={`odd-${groupIdx}-${id}`}
                    className="pointer-events-auto"
                  >
                    <ThumbnailCard 
                      id={id} 
                      cardWidth={cardSize.cardWidth}
                      cardHeight={cardSize.cardHeight}
                    />
                  </div>
                ))
              )}
          </div>
        </div>

        {/* 두 번째 슬라이드 - 짝수 (벽돌 패턴) */}
        <div className="overflow-x-hidden scrollbar-hidden">
          <div
            className="flex w-max pointer-events-none transform-gpu transition-all duration-300 ease-out"
            style={{
              height: `${cardSize.cardHeight + 20}px`, // 카드 높이 + 여백
              gap: `${cardSize.gap}px`,
              animation: isClient ? `slideLoop ${evenDuration}s linear infinite` : 'none',
              animationDelay: isClient ? `-${evenDuration / 2}s` : '0s', // 절반만큼 시간 오프셋
            }}
          >
            {Array(2) // 고정된 2배 복제로 부드러운 루프 구현
              .fill(0)
              .flatMap((_, groupIdx) =>
                even.map((id) => (
                  <div
                    key={`even-${groupIdx}-${id}`}
                    className="pointer-events-auto"
                  >
                    <ThumbnailCard 
                      id={id} 
                      cardWidth={cardSize.cardWidth}
                      cardHeight={cardSize.cardHeight}
                    />
                  </div>
                ))
              )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PortfolioGallery;