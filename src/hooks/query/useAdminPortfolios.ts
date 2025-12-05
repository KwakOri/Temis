import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPortfolioService } from "@/services/admin/portfolioClientService";
import {
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
} from "@/types/portfolio";

// Query Keys
export const portfolioKeys = {
  all: ["admin", "portfolios"] as const,
  lists: () => [...portfolioKeys.all, "list"] as const,
  detail: (id: string) => [...portfolioKeys.all, "detail", id] as const,
};

/**
 * 포트폴리오 목록 조회 훅
 */
export function useAdminPortfolios() {
  return useQuery({
    queryKey: portfolioKeys.lists(),
    queryFn: () => AdminPortfolioService.getPortfolios(),
  });
}

/**
 * 포트폴리오 생성 훅
 */
export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePortfolioRequest) =>
      AdminPortfolioService.createPortfolio(data),
    onSuccess: () => {
      // 포트폴리오 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

/**
 * 포트폴리오 수정 훅
 */
export function useUpdatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePortfolioRequest) =>
      AdminPortfolioService.updatePortfolio(data),
    onSuccess: (_, variables) => {
      // 포트폴리오 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
      // 특정 포트폴리오 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: portfolioKeys.detail(variables.id),
      });
    },
  });
}

/**
 * 포트폴리오 삭제 훅
 */
export function useDeletePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminPortfolioService.deletePortfolio(id),
    onSuccess: (_, id) => {
      // 포트폴리오 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
      // 특정 포트폴리오 캐시 무효화
      queryClient.invalidateQueries({ queryKey: portfolioKeys.detail(id) });
    },
  });
}
