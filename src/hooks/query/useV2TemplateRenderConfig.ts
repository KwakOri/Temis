import { queryKeys } from "@/lib/queryKeys";
import { V2TemplateRenderConfigService } from "@/services/v2_template_render_config_service";
import { useQuery } from "@tanstack/react-query";

export const useV2TemplateRenderConfig = (templateId?: string) => {
  return useQuery({
    queryKey: queryKeys.template.renderConfig(templateId || "unknown"),
    queryFn: () => V2TemplateRenderConfigService.getTemplateRenderConfig(templateId!),
    enabled: Boolean(templateId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
