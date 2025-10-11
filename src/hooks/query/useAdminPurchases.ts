import { queryKeys } from "@/lib/queryKeys";
import { AdminPurchaseService } from "@/services/admin/purchaseService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminPurchaseRequests = () => {
  return useQuery({
    queryKey: queryKeys.admin.purchaseRequests(),
    queryFn: () => AdminPurchaseService.getPurchaseRequests(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useApprovePurchaseRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      templateId,
      userId,
      planId,
    }: {
      requestId: string;
      templateId: string;
      userId: number;
      planId: string;
    }) =>
      AdminPurchaseService.approvePurchaseRequest(
        requestId,
        templateId,
        userId,
        planId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.purchaseRequests(),
      });
    },
  });
};

export const useRejectPurchaseRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      AdminPurchaseService.updatePurchaseRequestStatus(requestId, "rejected"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.purchaseRequests(),
      });
    },
  });
};
