import { queryKeys } from "@/lib/queryKeys";
import { AdminTemplateService } from "@/services/admin/templateService";
import {
  CreateTemplateData,
  CreateTemplatePlanData,
  CreateShopTemplateData,
  UpdateTemplateData,
  UpdateTemplatePlanData,
  UpdateShopTemplateData,
} from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminTemplates = () => {
  return useQuery({
    queryKey: queryKeys.admin.templates(),
    queryFn: () => AdminTemplateService.getTemplates(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateData) =>
      AdminTemplateService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
    },
  });
};

// Alias for component compatibility
export const useCreateAdminTemplate = useCreateTemplate;

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateTemplateData;
    }) => AdminTemplateService.updateTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
    },
  });
};

// Alias for component compatibility
export const useUpdateAdminTemplate = useUpdateTemplate;

export const useCreateShopTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShopTemplateData) =>
      AdminTemplateService.createShopTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
    },
  });
};

export const useUpdateShopTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: UpdateShopTemplateData;
    }) => AdminTemplateService.updateShopTemplate(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
    },
  });
};

export const useTemplatePlans = (templateId?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.templatePlans(templateId),
    queryFn: () => AdminTemplateService.getTemplatePlans(templateId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateTemplatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplatePlanData) =>
      AdminTemplateService.createTemplatePlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
    },
  });
};

export const useUpdateTemplatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      data,
    }: {
      planId: string;
      data: UpdateTemplatePlanData;
    }) => AdminTemplateService.updateTemplatePlan(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
    },
  });
};
