import { queryKeys } from "@/lib/queryKeys";
import { CustomThumbnailOrderService } from "@/services/customThumbnailOrderService";
import type { ThumbnailCustomOrderFormData } from "@/types/customThumbnailOrder";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useThumbnailCustomOrderHistory = () =>
  useQuery({
    queryKey: queryKeys.customOrder.orders("thumbnail"),
    queryFn: () => CustomThumbnailOrderService.getHistory(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const useEstimatedThumbnailCustomOrderDeadline = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.customOrder.estimatedDeadline("thumbnail"),
    queryFn: () => CustomThumbnailOrderService.getEstimatedDeadline(),
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useSubmitThumbnailCustomOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: ThumbnailCustomOrderFormData) =>
      CustomThumbnailOrderService.submit(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.history("thumbnail"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.orders("thumbnail"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.estimatedDeadline("thumbnail"),
      });
      queryClient.invalidateQueries({ queryKey: ["orderFiles"] });
    },
  });
};

export const useCancelThumbnailCustomOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      CustomThumbnailOrderService.cancel(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.history("thumbnail"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.orders("thumbnail"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.estimatedDeadline("thumbnail"),
      });
    },
  });
};
