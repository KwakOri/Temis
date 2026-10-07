import { queryKeys } from "@/lib/queryKeys";
import { updateStudioTemplateInfo } from "@/services/admin/studioTemplateInfoService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateStudioTemplateInfo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStudioTemplateInfo,
    // Refresh even on failure: earlier steps may already have committed.
    onSettled: (_data, _error, { templateId }) => {
      for (const queryKey of [
        queryKeys.admin.templateStudioTemplates(),
        queryKeys.admin.templates(),
        queryKeys.admin.template(templateId),
        queryKeys.admin.templateHub(),
        queryKeys.admin.templateHubItem(templateId),
        queryKeys.template.detail(templateId),
        queryKeys.template.shopDetail(templateId),
        queryKeys.shop.all,
        queryKeys.user.templates(),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};
