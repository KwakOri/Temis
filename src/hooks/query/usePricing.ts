import { queryKeys } from "@/lib/queryKeys";
import { PublicPriceOptionService } from "@/services/priceOptionService";
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

// 활성화된 가격 옵션 조회 (공개용)
export const usePriceOptions = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.pricing.options(category),
    queryFn: () => PublicPriceOptionService.getEnabledOptions(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
