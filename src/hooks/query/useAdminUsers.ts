import { queryKeys } from "@/lib/queryKeys";
import { AdminUserService } from "@/services/admin/userService";
import { GetUsersParams } from "@/types/admin";
import { useQuery } from "@tanstack/react-query";

export const useAdminUsers = (params: GetUsersParams = {}) => {
  return useQuery({
    queryKey: queryKeys.admin.users(params),
    queryFn: () => AdminUserService.getUsers(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserTemplates = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.admin.userTemplates(userId),
    queryFn: () => AdminUserService.getUserTemplates(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Alias for component compatibility
export const useAdminUserTemplates = (
  userId: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.admin.userTemplates(userId.toString()),
    queryFn: () => AdminUserService.getUserTemplates(userId.toString()),
    enabled: options?.enabled !== false && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
