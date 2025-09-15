import { queryKeys } from "@/lib/queryKeys";
import { PricingService } from "@/services/pricingService";
import { useQuery } from "@tanstack/react-query";

export const usePricingSettings = () => {
  return useQuery({
    queryKey: queryKeys.pricing.settings(),
    queryFn: () => PricingService.getPricingSettings(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
