import { queryKeys } from "@/lib/queryKeys";
import { TemplateStudioPreviewService } from "@/services/templateStudioPreviewService";
import { useQuery } from "@tanstack/react-query";

export const useTemplateStudioPreview = (templateId?: string) =>
  useQuery({
    queryKey: queryKeys.template.templateStudioPreview(templateId || "unknown"),
    queryFn: () =>
      TemplateStudioPreviewService.getPublishedPreview(templateId!),
    enabled: Boolean(templateId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
