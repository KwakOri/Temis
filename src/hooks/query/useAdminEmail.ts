import { useQuery, useMutation } from '@tanstack/react-query'
import { AdminEmailService } from '@/services/admin/emailService'
import { queryKeys } from '@/lib/queryKeys'
import { SendTestEmailData } from '@/types/admin'

export const useEmailConnectionTest = () => {
  return useQuery({
    queryKey: queryKeys.admin.emailTest(),
    queryFn: AdminEmailService.testConnection,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useSendTestEmail = () => {
  return useMutation({
    mutationFn: (data: SendTestEmailData) => AdminEmailService.sendTestEmail(data),
  })
}