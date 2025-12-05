import { Portfolio } from "@/types/portfolio";

export interface GetPortfoliosParams {
  category?: string;
  page?: number;
}

export interface GetPortfoliosResponse {
  success: boolean;
  portfolios: Portfolio[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetPortfolioResponse {
  success: boolean;
  portfolio: Portfolio;
}

/**
 * 공개 포트폴리오 클라이언트 서비스
 */
export class PortfolioService {
  /**
   * 포트폴리오 목록 조회 (페이지네이션 및 카테고리 필터링)
   */
  static async getPortfolios(
    params: GetPortfoliosParams = {}
  ): Promise<GetPortfoliosResponse> {
    const { category = "all", page = 1 } = params;

    const searchParams = new URLSearchParams({
      category,
      page: page.toString(),
    });

    const response = await fetch(`/api/portfolios?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("포트폴리오 목록 조회에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 포트폴리오 상세 조회
   */
  static async getPortfolioById(id: string): Promise<GetPortfolioResponse> {
    const response = await fetch(`/api/portfolios/${id}`);

    if (!response.ok) {
      throw new Error("포트폴리오 조회에 실패했습니다.");
    }

    return response.json();
  }
}
