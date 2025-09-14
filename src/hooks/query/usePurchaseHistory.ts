import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PurchaseHistoryService } from '@/services/purchaseHistoryService'
import { queryKeys } from '@/lib/queryKeys'
import { UpdatePurchaseRequestData } from '@/types/purchaseHistory'

export const usePurchaseHistory = () => {
  return useQuery({
    queryKey: queryKeys.purchaseHistory.list(),
    queryFn: PurchaseHistoryService.getPurchaseHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useUpdatePurchaseRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string
      data: UpdatePurchaseRequestData
    }) => PurchaseHistoryService.updatePurchaseRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseHistory.list(),
      })
    },
  })
}

export const useDeletePurchaseRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) =>
      PurchaseHistoryService.deletePurchaseRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseHistory.list(),
      })
    },
  })
}