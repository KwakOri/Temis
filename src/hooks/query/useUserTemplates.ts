import { queryKeys } from "@/lib/queryKeys";
import { UserService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";

export const useUserTemplates = () => {
  return useQuery({
    queryKey: queryKeys.user.templates(),
    queryFn: UserService.getUserTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
