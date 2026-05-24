import { queryKeys } from "@/lib/queryKeys";
import {
  AdminV2TemplateRenderConfigService,
  V2CreateAdminTemplatePayload,
  V2UpdateTemplateRenderConfigPayload,
} from "@/services/admin/v2_template_render_config_service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminV2TemplateRenderConfig = (templateId?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.v2TemplateRenderConfig(templateId || "unknown"),
    queryFn: () =>
      AdminV2TemplateRenderConfigService.getTemplateRenderConfig(templateId!),
    enabled: Boolean(templateId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useUpdateAdminV2TemplateRenderConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload: V2UpdateTemplateRenderConfigPayload;
    }) =>
      AdminV2TemplateRenderConfigService.updateTemplateRenderConfig(
        templateId,
        payload
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.v2TemplateRenderConfig(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.template.renderConfig(variables.templateId),
      });
    },
  });
};

export const useCreateAdminV2Template = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: V2CreateAdminTemplatePayload) =>
      AdminV2TemplateRenderConfigService.createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.template.v2Templates(),
      });
    },
  });
};
