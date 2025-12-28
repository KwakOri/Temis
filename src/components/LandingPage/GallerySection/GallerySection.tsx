"use client";

import { usePortfolios } from "@/hooks/query/usePortfolios";
import { Portfolio } from "@/types/portfolio";
import { useEffect, useState } from "react";
import SectionTitle from "../SectionTitle";
import GalleryItem from "./GalleryItem";

// 브라우저 크기별 카드 크기 설정 (16:9 비율 유지) - 두 단계 업그레이드
const getCardSizeByViewport = (windowWidth: number) => {
  if (windowWidth >= 3840) {
    return { cardWidth: 750, gap: 40, cardHeight: Math.round((750 / 16) * 9) };
  } else if (windowWidth >= 2560) {
    return { cardWidth: 750, gap: 40, cardHeight: Math.round((750 / 16) * 9) };
  } else if (windowWidth >= 1920) {
    return { cardWidth: 600, gap: 32, cardHeight: Math.round((600 / 16) * 9) };
  } else if (windowWidth >= 1440) {
    return { cardWidth: 480, gap: 26, cardHeight: Math.round((480 / 16) * 9) };
  } else if (windowWidth >= 1024) {
    return { cardWidth: 390, gap: 21, cardHeight: Math.round((390 / 16) * 9) };
  } else if (windowWidth >= 768) {
    return { cardWidth: 330, gap: 18, cardHeight: Math.round((330 / 16) * 9) };
  } else {
    return { cardWidth: 300, gap: 16, cardHeight: Math.round((300 / 16) * 9) };
  }
};

const defaultCardSize = {
  cardWidth: 536,
  gap: 16,
  cardHeight: Math.round((300 / 16) * 9),
};

// 카테고리별 정보
const categoryInfo: Record<
  string,
  { title: string; price: string; description: string }
> = {
  structured: {
    title: "타입 A",
    price: "정형 템플릿 (₩80,000)",
    description:
      '깔끔한 구조와 높은 가시성이 특징이며, <span style="color: #F56015;">빠른 제작</span>이 가능한 실용적인 기본형 템플릿입니다.',
  },
  unstructured: {
    title: "타입 B",
    price: "비정형 템플릿 (₩100,000)",
    description:
      '독특한 형태와 <span style="color: #F56015;">화려한 연출</span>이 강점인 개성 있는 커스텀 템플릿입니다.',
  },
  team: {
    title: "타입 C",
    price: "팀 전용 템플릿 (₩100,000)",
    description:
      '팀 일정을 통일된 디자인으로 관리할 수 있는 <span style="color: #F56015;">팀용 템플릿</span>입니다.<br/>해당 템플릿 주문 시 <span style="color: #F56015;">팀원 전원의 테미스 템플릿을 10% 할인된 가격</span>으로 제공합니다.',
  },
};

interface CategorySectionProps {
  category: string;
  portfolios: Portfolio[];
  cardSize: typeof defaultCardSize;
  isClient: boolean;
  speedPxPerSecond?: number;
  isOddRow?: boolean;
}

const FIXED_ITEMS_COUNT = 10;

// 더미 포트폴리오 생성 함수
const createDummyPortfolio = (index: number): Portfolio => ({
  id: `dummy-${index}`,
  title: "COMING SOON",
  description: "",
  category: "dummy",
  thumbnail_url: "",
  image_urls: [],
  created_at: "",
  updated_at: "",
  created_by: null,
});

const CategorySection = ({
  category,
  portfolios,
  cardSize,
  isClient,
  speedPxPerSecond = 50,
  isOddRow = false,
}: CategorySectionProps) => {
  const info = categoryInfo[category] || {
    title: category,
    price: "",
    description: "",
  };

  // 포트폴리오를 10개로 고정
  let fixedPortfolios: Portfolio[];
  if (portfolios.length > FIXED_ITEMS_COUNT) {
    // 10개보다 많으면 랜덤으로 10개 추출
    const shuffled = [...portfolios].sort(() => Math.random() - 0.5);
    fixedPortfolios = shuffled.slice(0, FIXED_ITEMS_COUNT);
  } else if (portfolios.length < FIXED_ITEMS_COUNT) {
    // 10개보다 적으면 더미로 채움
    const dummyCount = FIXED_ITEMS_COUNT - portfolios.length;
    const dummies = Array.from({ length: dummyCount }, (_, i) =>
      createDummyPortfolio(i)
    );
    fixedPortfolios = [...portfolios, ...dummies];
  } else {
    fixedPortfolios = portfolios;
  }

  const CARD_WITH_GAP = cardSize.cardWidth + cardSize.gap;

  // 벽돌식 레이아웃을 위한 오프셋 (카드 너비의 절반)
  const brickOffset = isOddRow ? CARD_WITH_GAP / 2 : 0;

  // 고정된 10개 아이템 기준으로 계산
  const totalWidth = FIXED_ITEMS_COUNT * CARD_WITH_GAP;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  // 화면 너비의 6배로 증가하여 충분한 복사본 확보
  const effectiveScreenWidth = screenWidth * 6 + (isOddRow ? brickOffset : 0);
  const minRepeats = Math.max(4, Math.ceil(effectiveScreenWidth / totalWidth));

  const duration =
    (FIXED_ITEMS_COUNT * minRepeats * CARD_WITH_GAP) / speedPxPerSecond;

  return (
    <div className="mb-16">
      {/* 타이틀 및 설명 */}
      <div className="text-center mb-8">
        <h3 className="text-[#1B1612] text-[40px] font-bold mb-3">
          {info.title} — {info.price}
        </h3>
        <p
          className="text-[#1B1612] leading-relaxed text-2xl font-semibold"
          dangerouslySetInnerHTML={{ __html: info.description }}
        />
      </div>

      {/* 갤러리 슬라이드 - 한 줄 */}
      <div
        className="overflow-x-hidden scrollbar-hidden"
        style={{
          width: `calc(100% + ${brickOffset}px)`,
          transform: `translateX(-${brickOffset}px)`,
        }}
      >
        <div
          className="flex w-max pointer-events-none transform-gpu transition-all duration-300 ease-out"
          style={{
            height: `${cardSize.cardHeight + 20}px`,
            gap: `${cardSize.gap}px`,
            animation: isClient
              ? `slideLoop ${duration}s linear infinite`
              : "none",
          }}
        >
          {Array(minRepeats)
            .fill(0)
            .flatMap((_, groupIdx) =>
              fixedPortfolios.map((portfolio) => {
                const isDummy = portfolio.id.startsWith("dummy-");
                return (
                  <div
                    key={`${groupIdx}-${portfolio.id}`}
                    className={isDummy ? "" : "pointer-events-auto"}
                  >
                    {isDummy ? (
                      // 더미 카드 (클릭 불가능)
                      <div
                        className="flex items-center justify-center rounded-lg overflow-hidden bg-gray-200 border-2 border-dashed border-gray-400"
                        style={{
                          width: `${cardSize.cardWidth}px`,
                          height: `${cardSize.cardHeight}px`,
                        }}
                      >
                        <span className="text-gray-500 text-xl font-semibold">
                          COMING SOON
                        </span>
                      </div>
                    ) : (
                      // 실제 포트폴리오 카드
                      <GalleryItem
                        portfolio={portfolio}
                        cardWidth={cardSize.cardWidth}
                        cardHeight={cardSize.cardHeight}
                      />
                    )}
                  </div>
                );
              })
            )}
        </div>
      </div>
    </div>
  );
};

const GallerySection = () => {
  const { data, isLoading, error } = usePortfolios({
    category: "all",
    limit: 999,
  });
  const [cardSize, setCardSize] = useState(defaultCardSize);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const initialSize = getCardSizeByViewport(window.innerWidth);
    setCardSize(initialSize);

    const handleResize = () => {
      const newCardSize = getCardSizeByViewport(window.innerWidth);
      setCardSize(newCardSize);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isLoading) {
    return (
      <section className="py-20 bg-[#F3E9E7] text-center">
        <p className="text-gray-600">로딩 중...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-[#F3E9E7] text-center">
        <p className="text-red-600">
          포트폴리오를 불러오는 중 오류가 발생했습니다
        </p>
      </section>
    );
  }

  if (!data?.portfolios || data.portfolios.length === 0) {
    return (
      <section className="py-20 bg-[#F3E9E7] text-center">
        <p className="text-gray-600">포트폴리오를 준비 중입니다</p>
      </section>
    );
  }

  // 카테고리별로 그룹화
  const portfoliosByCategory = data.portfolios.reduce((acc, portfolio) => {
    if (!acc[portfolio.category]) {
      acc[portfolio.category] = [];
    }
    acc[portfolio.category].push(portfolio);
    return acc;
  }, {} as Record<string, Portfolio[]>);

  // 디버깅: 실제 카테고리 확인
  console.log("Available categories:", Object.keys(portfoliosByCategory));
  console.log("Portfolios by category:", portfoliosByCategory);

  // 카테고리 표시 순서 고정 (우선순위)
  const categoryOrder = ["structured", "unstructured", "team"];

  // 실제 존재하는 카테고리를 우선순위에 따라 정렬
  const availableCategories = Object.keys(portfoliosByCategory);
  const sortedCategories = [
    ...categoryOrder.filter((cat) => availableCategories.includes(cat)),
    ...availableCategories.filter((cat) => !categoryOrder.includes(cat)),
  ];

  return (
    <section className="pb-20 pt-10 bg-[#F3E9E7]">
      <div className="mb-6 text-center">
        <SectionTitle label="PRICES" />
      </div>

      <div className="mx-auto">
        {sortedCategories.map((category, index) => {
          const portfolios = portfoliosByCategory[category];
          if (!portfolios || portfolios.length === 0) return null;

          return (
            <CategorySection
              key={category}
              category={category}
              portfolios={portfolios}
              cardSize={cardSize}
              isClient={isClient}
              isOddRow={index % 2 === 1}
            />
          );
        })}
      </div>

      {/* 포트폴리오 더보기 버튼 */}
      <div className="flex justify-center mt-12">
        <button className="flex justify-center items-center w-100 h-12 rounded-2xl bg-[#FD9319] brightness-100 hover:brightness-75 text-white text-lg transition-all">
          포트폴리오 더보기
        </button>
      </div>
    </section>
  );
};

export default GallerySection;
