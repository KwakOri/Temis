"use client";

import { splitOddEven } from "@/utils/utils";
import ThumbnailCard from "./ThumbnailCard";

interface PortfolioGalleryProps {
  totalItems: number;
  speedPxPerSecond?: number;
  cardWidth?: number;
  gap?: number;
}

const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  totalItems,
  speedPxPerSecond = 50,
  cardWidth = 200,
  gap = 16,
}) => {
  const [odd, even] = splitOddEven(totalItems);

  // 카드 폭 + 간격을 기준으로 애니메이션 duration 계산
  const CARD_WITH_GAP = cardWidth + gap;

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
            className="flex h-[210px] w-max gap-4 pointer-events-none transform-gpu"
            style={{
              animation: `slideLoop ${oddDuration}s linear infinite`,
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
                    <ThumbnailCard id={id} />
                  </div>
                ))
              )}
          </div>
        </div>

        {/* 두 번째 슬라이드 - 짝수 (벽돌 패턴) */}
        <div className="overflow-x-hidden scrollbar-hidden">
          <div
            className="flex h-[210px] w-max gap-4 pointer-events-none transform-gpu"
            style={{
              animation: `slideLoop ${evenDuration}s linear infinite`,
              animationDelay: `-${evenDuration / 2}s`, // 절반만큼 시간 오프셋
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
                    <ThumbnailCard id={id} />
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