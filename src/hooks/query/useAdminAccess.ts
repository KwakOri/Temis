import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { AdminAccessService } from "@/services/admin/accessService";
import type { RevokeAccessParams, TemplateAccessData } from "@/types/admin";

export const useTemplateAccess = (templateId: string) => {
  return useQuery({
    queryKey: queryKeys.admin.templateAccess(templateId),
    queryFn: () => AdminAccessService.getTemplateAccess({ templateId }),
    enabled: !!templateId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useGrantTemplateAccessAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TemplateAccessData) =>
      AdminAccessService.grantAccess(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateAccess(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.templates(),
      });
    },
  });
};

export const useUpdateTemplateAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TemplateAccessData) =>
      AdminAccessService.updateAccess(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateAccess(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.templates(),
      });
    },
  });
};

export const useRevokeTemplateAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RevokeAccessParams) =>
      AdminAccessService.revokeAccess(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateAccess(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.templates(),
      });
    },
  });
};
