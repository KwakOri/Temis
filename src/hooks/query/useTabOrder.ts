import { TabOrderService } from "@/services/admin/tabOrderService";
import { AdminTabOrder, UpdateTabOrderRequest } from "@/types/tabOrder";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const TAB_ORDER_QUERY_KEY = ["admin", "tab-order"];

export function useTabOrders() {
  return useQuery<AdminTabOrder[]>({
    queryKey: TAB_ORDER_QUERY_KEY,
    queryFn: () => TabOrderService.getTabOrders(),
  });
}

export function useUpdateTabOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orders: UpdateTabOrderRequest["orders"]) =>
      TabOrderService.updateTabOrders(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAB_ORDER_QUERY_KEY });
    },
  });
}
