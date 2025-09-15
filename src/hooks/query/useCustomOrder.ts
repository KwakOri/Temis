import { queryKeys } from "@/lib/queryKeys";
import { CustomOrderService } from "@/services/customOrderService";
import { CustomOrderFormData } from "@/types/customOrder";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCustomOrderHistory = () => {
  return useQuery({
    queryKey: queryKeys.customOrder.orders(),
    queryFn: CustomOrderService.getCustomOrderHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSubmitCustomOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: CustomOrderFormData) =>
      CustomOrderService.submitCustomOrder(formData),
    onSuccess: () => {
      // 주문 내역 캐시 무효화하여 새로고침 트리거
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.history(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.orders(),
      });
    },
  });
};

export const useCancelCustomOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      CustomOrderService.cancelCustomOrder(orderId),
    onSuccess: () => {
      // 주문 내역 캐시 무효화하여 새로고침 트리거
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.history(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customOrder.orders(),
      });
    },
  });
};
