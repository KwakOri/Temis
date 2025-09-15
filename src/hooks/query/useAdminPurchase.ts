import { queryKeys } from "@/lib/queryKeys";
import { AdminPurchaseService } from "@/services/admin/purchaseService";
import {
  GrantTemplateAccessData,
  SendAccessGrantedEmailData,
} from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminPurchaseRequests = () => {
  return useQuery({
    queryKey: queryKeys.admin.purchaseRequests(),
    queryFn: AdminPurchaseService.getPurchaseRequests,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useFindUserByEmail = () => {
  return useMutation({
    mutationFn: (email: string) => AdminPurchaseService.findUserByEmail(email),
  });
};

export const useGrantTemplateAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GrantTemplateAccessData) =>
      AdminPurchaseService.grantTemplateAccess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.purchaseRequests(),
      });
    },
  });
};

export const useUpdatePurchaseRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      status,
    }: {
      requestId: string;
      status: string;
    }) => AdminPurchaseService.updatePurchaseRequestStatus(requestId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.purchaseRequests(),
      });
    },
  });
};

export const useSendAccessGrantedEmail = () => {
  return useMutation({
    mutationFn: (data: SendAccessGrantedEmailData) =>
      AdminPurchaseService.sendAccessGrantedEmail(data),
  });
};
