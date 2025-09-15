import { queryKeys } from "@/lib/queryKeys";
import { TemplateDetailService } from "@/services/templateDetailService";
import { PurchaseRequestData } from "@/types/templateDetail";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useTemplateDetail = (templateId: string) => {
  return useQuery({
    queryKey: queryKeys.template.shopDetail(templateId),
    queryFn: () => TemplateDetailService.getTemplateDetail(templateId),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // 템플릿을 찾을 수 없는 경우에는 재시도하지 않음
      if (
        error instanceof Error &&
        error.message.includes("템플릿을 찾을 수 없습니다")
      ) {
        return false;
      }
      return failureCount < 1;
    },
  });
};

export const useSubmitPurchaseRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestData: PurchaseRequestData) =>
      TemplateDetailService.submitPurchaseRequest(requestData),
    onSuccess: () => {
      // 구매 내역 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseHistory.list(),
      });
    },
  });
};
