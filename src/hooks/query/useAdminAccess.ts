import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminAccessService } from '@/services/admin/accessService'
import { queryKeys } from '@/lib/queryKeys'
import { TemplateAccessData, RevokeAccessParams } from '@/types/admin'

export const useTemplateAccess = (templateId: string) => {
  return useQuery({
    queryKey: queryKeys.admin.templateAccess(templateId),
    queryFn: () => AdminAccessService.getTemplateAccess({ templateId }),
    enabled: !!templateId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useGrantTemplateAccessAdmin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TemplateAccessData) => AdminAccessService.grantAccess(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateAccess(variables.templateId),
      })
    },
  })
}

export const useUpdateTemplateAccess = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TemplateAccessData) => AdminAccessService.updateAccess(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateAccess(variables.templateId),
      })
    },
  })
}

export const useRevokeTemplateAccess = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: RevokeAccessParams) => AdminAccessService.revokeAccess(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateAccess(variables.templateId),
      })
    },
  })
}