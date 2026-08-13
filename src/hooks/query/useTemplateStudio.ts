import { queryKeys } from "@/lib/queryKeys";
import {
  TemplateStudioCreateTemplatePayload,
  TemplateStudioPublishPayload,
  TemplateStudioSaveDraftPayload,
  TemplateStudioService,
  TemplateStudioUploadAssetPayload,
} from "@/services/templateStudioService";
import { TemplateStudioRuntimeService } from "@/services/templateStudioRuntimeService";
import type {
  StudioRuntimeValues,
  StudioTemplateKind,
} from "@/types/template-studio";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useTemplateStudioTemplates = (templateKind?: StudioTemplateKind) =>
  useQuery({
    queryKey: queryKeys.admin.templateStudioTemplates(templateKind),
    queryFn: () => TemplateStudioService.listTemplates(templateKind),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.template.templateStudioPreview(
          variables.templateId,
        ),
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

export const useSyncTemplateStudioAssets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      assets,
    }: {
      templateId: string;
      assets: TemplateStudioUploadAssetPayload[];
    }) => TemplateStudioService.syncAssets(templateId, assets),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplate(variables.templateId),
      });
    },
  });
};

export const useTemplateStudioRuntime = (templateId?: string) =>
  useQuery({
    queryKey: queryKeys.template.templateStudioRuntime(templateId || "unknown"),
    queryFn: () => TemplateStudioRuntimeService.getRuntime(templateId!),
    enabled: Boolean(templateId),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

export const useThumbnailStudioRuntime = (templateId?: string) =>
  useQuery({
    queryKey: queryKeys.template.thumbnailStudioRuntime(
      templateId || "unknown",
    ),
    queryFn: () =>
      TemplateStudioRuntimeService.getThumbnailRuntime(templateId!),
    enabled: Boolean(templateId),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

export const useSaveTemplateStudioRuntime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      runtimeValues,
    }: {
      templateId: string;
      runtimeValues: StudioRuntimeValues;
    }) => TemplateStudioRuntimeService.saveRuntime(templateId, runtimeValues),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.template.templateStudioRuntime(
          variables.templateId,
        ),
      });
    },
  });
};

export const useDeleteTemplateStudioTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      TemplateStudioService.deleteTemplate(templateId),
    onSuccess: (_, templateId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateStudioTemplates(),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.admin.templateStudioTemplate(templateId),
      });
    },
  });
};
