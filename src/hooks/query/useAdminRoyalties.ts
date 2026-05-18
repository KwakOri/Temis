import { queryKeys } from "@/lib/queryKeys";
import { AdminRoyaltyService } from "@/services/admin/royaltyService";
import {
  GetRoyaltySalesParams,
  MarkRoyaltiesPaidData,
  UpdateRoyaltyData,
} from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminRoyaltySummary = (params?: {
  from?: string;
  to?: string;
  status?: "unpaid" | "paid" | "all";
}) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySummary(
      params?.from,
      params?.to,
      params?.status
    ),
    queryFn: () => AdminRoyaltyService.getSummary(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useAdminRoyaltySales = (params?: GetRoyaltySalesParams) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySales(params),
    queryFn: () => AdminRoyaltyService.getSales(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useUpdateRoyalty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRoyaltyData;
    }) => AdminRoyaltyService.updateRoyalty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    },
  });
};

export const useMarkRoyaltiesPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkRoyaltiesPaidData) =>
      AdminRoyaltyService.markPaid(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    },
  });
};
