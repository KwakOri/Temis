import { queryKeys } from "@/lib/queryKeys";
import { ShopService } from "@/services/shopService";
import { SortOrder } from "@/types/shop";
import { useQuery } from "@tanstack/react-query";

export const usePublicTemplates = (sortOrder: SortOrder = "newest") => {
  return useQuery({
    queryKey: queryKeys.shop.templates(sortOrder),
    queryFn: () => ShopService.getPublicTemplates(sortOrder),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUserTemplateAccess = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.shop.userAccess(userId),
    queryFn: () => ShopService.getUserTemplateAccess(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
