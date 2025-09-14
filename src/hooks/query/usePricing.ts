import { useQuery } from '@tanstack/react-query'
import { PricingService } from '@/services/pricingService'
import { queryKeys } from '@/lib/queryKeys'

export const usePricingSettings = () => {
  return useQuery({
    queryKey: queryKeys.pricing.settings(),
    queryFn: PricingService.getPricingSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}