import { useQuery } from "@tanstack/react-query";
import { PortfolioService } from "@/services/portfolioService";
import { Portfolio } from "@/types/portfolio";
import {
  GalleryRowData,
  GalleryItemData,
} from "@/components/LandingPage/GallerySection/GallerySection";

/**
 * Portfolio를 GalleryItemData로 변환
 */
function portfolioToGalleryItem(portfolio: Portfolio): GalleryItemData {
  return {
    id: portfolio.id,
    imageUrl: portfolio.thumbnail_url,
    title: portfolio.title,
    href: `/portfolio/${portfolio.id}`,
  };
}

/**
 * 카테고리별로 포트폴리오를 그룹화
 */
function groupPortfoliosByCategory(portfolios: Portfolio[]): Map<string, Portfolio[]> {
  const grouped = new Map<string, Portfolio[]>();

  portfolios.forEach((portfolio) => {
    const category = portfolio.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(portfolio);
  });

  return grouped;
}

/**
 * 카테고리별 타입 정보
 */
const categoryTypeInfo: Record<
  string,
  { title: string; price: string; description: string }
> = {
  "타입A": {
    title: "타입 A",
    price: "정형 템플릿 (₩80,000)",
    description:
      '깔끔한 구조와 높은 가시성이 특징이며, <span style="color: #FF0000;">빠른 제작</span>이 가능한 실용적인 기본형 템플릿입니다.',
  },
  "타입B": {
    title: "타입 B",
    price: "비정형 템플릿 (₩100,000)",
    description:
      '독특한 형태와 <span style="color: #FF0000;">화려한 연출</span>이 강점인 개성 있는 커스텀 템플릿입니다.',
  },
  "타입C": {
    title: "타입 C",
    price: "팀 전용 템플릿 (₩120,000)",
    description:
      '팀 일정을 통일된 디자인으로 관리할 수 있는 <span style="color: #FF0000;">팀용 템플릿</span>입니다.<br/>해당 템플릿 주문 시 <span style="color: #FF0000;">팀원 전원의 테미스 템플릿을 10% 할인된 가격</span>으로 제공합니다.',
  },
};

/**
 * 카테고리별로 그룹화된 포트폴리오를 GalleryRowData 배열로 변환
 * @param slideInterval 슬라이드 간격 (ms)
 * @param reverseAlternate true면 홀수 행은 정방향, 짝수 행은 역방향
 */
export function usePortfolioGallery(
  slideInterval: number = 3000,
  reverseAlternate: boolean = true
) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolios", "all", 1],
    queryFn: () => PortfolioService.getPortfolios({ category: "all", page: 1 }),
  });

  // 카테고리별로 그룹화된 갤러리 행 데이터
  const galleryRows: GalleryRowData[] = [];

  if (data?.portfolios) {
    const grouped = groupPortfoliosByCategory(data.portfolios);

    let rowIndex = 0;
    grouped.forEach((portfolios, category) => {
      const items = portfolios.map(portfolioToGalleryItem);
      const typeInfo = categoryTypeInfo[category] || {
        title: category,
        price: "",
        description: "",
      };

      galleryRows.push({
        id: `row-${category}`,
        title: typeInfo.title,
        price: typeInfo.price,
        description: typeInfo.description,
        items,
        slideInterval,
        reverse: reverseAlternate ? rowIndex % 2 === 1 : false,
      });

      rowIndex++;
    });
  }

  return {
    galleryRows,
    isLoading,
    error,
  };
}
