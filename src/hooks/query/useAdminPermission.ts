import { queryKeys } from "@/lib/queryKeys";
import { AdminService } from "@/services/admin/adminService";
import { useQuery } from "@tanstack/react-query";

export const useAdminPermission = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.admin.permission(),
    queryFn: () => AdminService.checkAdminPermission(),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
