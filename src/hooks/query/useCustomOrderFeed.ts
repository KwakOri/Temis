import { queryKeys } from "@/lib/queryKeys";
import { CustomOrderFeedService } from "@/services/customOrderFeedService";
import { useQuery } from "@tanstack/react-query";

export const useCustomOrderFeed = () =>
  useQuery({
    queryKey: queryKeys.customOrder.feed(),
    queryFn: () => CustomOrderFeedService.getHistory(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
