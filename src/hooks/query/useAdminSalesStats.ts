import { queryKeys } from "@/lib/queryKeys";
import { AdminSalesService } from "@/services/admin/salesService";
import { useQuery } from "@tanstack/react-query";

export const useAdminSalesStats = (params?: { from?: string; to?: string }) => {
  return useQuery({
    queryKey: queryKeys.admin.salesStats(params?.from, params?.to),
    queryFn: () => AdminSalesService.getSalesStats(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

