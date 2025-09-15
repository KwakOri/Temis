import { queryKeys } from "@/lib/queryKeys";
import { AdminPurchaseService } from "@/services/admin/purchaseService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminPurchaseRequests = () => {
  return useQuery({
    queryKey: queryKeys.admin.purchaseRequests(),
    queryFn: AdminPurchaseService.getPurchaseRequests,
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
      customerEmail,
    }: {
      requestId: string;
      templateId: string;
      customerEmail: string;
    }) =>
      AdminPurchaseService.approvePurchaseRequest(
        requestId,
        templateId,
        customerEmail
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