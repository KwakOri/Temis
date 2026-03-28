import { useQuery } from "@tanstack/react-query";
import {
  PortfolioService,
  GetPortfoliosParams,
} from "@/services/portfolioService";

/**
 * 포트폴리오 목록 조회 훅
 */
export function usePortfolios(params: GetPortfoliosParams = {}) {
  return useQuery({
    queryKey: ["portfolios", params.category || "all", params.page || 1],
    queryFn: () => PortfolioService.getPortfolios(params),
  });
}

/**
 * 포트폴리오 상세 조회 훅
 */
export function usePortfolio(id: string) {
  return useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => PortfolioService.getPortfolioById(id),
    enabled: !!id,
  });
}
