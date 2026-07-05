import { queryKeys } from "@/lib/queryKeys";
import {
  TemplateStudioCreateTemplatePayload,
  TemplateStudioPublishPayload,
  TemplateStudioSaveDraftPayload,
  TemplateStudioService,
  TemplateStudioUploadAssetPayload,
} from "@/services/templateStudioService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useTemplateStudioTemplates = () =>
  useQuery({
    queryKey: queryKeys.admin.templateStudioTemplates(),
    queryFn: () => TemplateStudioService.listTemplates(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useTemplateStudioTemplate = (templateId?: string) =>
  useQuery({
    queryKey: queryKeys.admin.templateStudioTemplate(templateId || "unknown"),
    queryFn: () => TemplateStudioService.getTemplate(templateId!),
    enabled: Boolean(templateId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useTemplateStudioDraft = (templateId?: string) =>
  useQuery({
    queryKey: queryKeys.admin.templateStudioDraft(templateId || "unknown"),
    queryFn: () => TemplateStudioService.getDraft(templateId!),
    enabled: Boolean(templateId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useCreateTemplateStudioTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TemplateStudioCreateTemplatePayload) =>
      TemplateStudioService.createTemplate(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplate(response.template.id),
      });
    },
  });
};

export const useSaveTemplateStudioDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload: TemplateStudioSaveDraftPayload;
    }) => TemplateStudioService.saveDraft(templateId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplate(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioDraft(variables.templateId),
      });
    },
  });
};

export const usePublishTemplateStudioDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload: TemplateStudioPublishPayload;
    }) => TemplateStudioService.publish(templateId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplate(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioDraft(variables.templateId),
      });
    },
  });
};

export const useUploadTemplateStudioAssets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      assets,
    }: {
      templateId: string;
      assets: TemplateStudioUploadAssetPayload[];
    }) => TemplateStudioService.uploadAssets(templateId, assets),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplate(variables.templateId),
      });
    },
  });
};
