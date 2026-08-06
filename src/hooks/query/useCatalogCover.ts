import { queryKeys } from "@/lib/queryKeys";
import { AdminCatalogCoverService } from "@/services/admin/catalogCoverService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const invalidateCatalogCoverQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  templateId: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates() });
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.template(templateId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.templateHub(),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.template.shopDetail(templateId),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.shop.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.user.templates() });
};

export const useUploadCatalogCover = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, file }: { templateId: string; file: File }) =>
      AdminCatalogCoverService.upload(templateId, file),
    onSuccess: (_response, variables) => {
      invalidateCatalogCoverQueries(queryClient, variables.templateId);
    },
  });
};

export const useDeleteCatalogCover = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      AdminCatalogCoverService.remove(templateId),
    onSuccess: (_response, templateId) => {
      invalidateCatalogCoverQueries(queryClient, templateId);
    },
  });
};
