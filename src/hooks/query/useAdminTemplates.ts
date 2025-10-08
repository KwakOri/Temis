import { queryKeys } from "@/lib/queryKeys";
import { AdminTemplateService } from "@/services/admin/templateService";
import {
  CreateTemplateData,
  CreateTemplatePlanData,
  CreateTemplateProductData,
  UpdateTemplateData,
  UpdateTemplatePlanData,
  UpdateTemplateProductData,
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

export const useCreateTemplateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateProductData) =>
      AdminTemplateService.createTemplateProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templates(),
      });
    },
  });
};

export const useUpdateTemplateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: UpdateTemplateProductData;
    }) => AdminTemplateService.updateTemplateProduct(productId, data),
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
