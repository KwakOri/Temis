import { queryKeys } from "@/lib/queryKeys";
import {
  AdminRoyaltyService,
  AdminRoyaltySettingsService,
} from "@/services/admin/royaltyService";
import {
  GetRoyaltyBatchesParams,
  GetRoyaltySalesParams,
  MarkRoyaltiesPaidData,
  RecalculateRoyaltiesData,
  RoyaltyRuleInput,
  UpdateRoyaltyData,
} from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminRoyaltySummary = (params?: {
  from?: string;
  to?: string;
  status?: "unpaid" | "paid" | "all";
}) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySummary(
      params?.from,
      params?.to,
      params?.status
    ),
    queryFn: () => AdminRoyaltyService.getSummary(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useAdminRoyaltySales = (params?: GetRoyaltySalesParams) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySales(params),
    queryFn: () => AdminRoyaltyService.getSales(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useUpdateRoyalty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRoyaltyData;
    }) => AdminRoyaltyService.updateRoyalty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    },
  });
};

export const useMarkRoyaltiesPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkRoyaltiesPaidData) =>
      AdminRoyaltyService.markPaid(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    },
  });
};

export const useAdminRoyaltyBatches = (params?: GetRoyaltyBatchesParams) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltyBatches(params),
    queryFn: () => AdminRoyaltyService.getBatches(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useAdminRoyaltyBatch = (batchId?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltyBatch(batchId || ""),
    queryFn: () => AdminRoyaltyService.getBatch(batchId || ""),
    enabled: Boolean(batchId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useRecalculateRoyalties = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecalculateRoyaltiesData) =>
      AdminRoyaltyService.recalculate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    },
  });
};

export const useAdminRoyaltySettlementRun = (month?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySettlementRun(month),
    queryFn: () => AdminRoyaltyService.getSettlementRun(month || ""),
    enabled: Boolean(month),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useRoyaltySettingsArtists = () => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySettingsArtists(),
    queryFn: () => AdminRoyaltySettingsService.getArtists(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useRoyaltySettingsArtistTemplates = (artistId?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySettingsArtistTemplates(artistId),
    queryFn: () => AdminRoyaltySettingsService.getArtistTemplates(artistId || ""),
    enabled: Boolean(artistId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useRoyaltySettingsTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.royaltySettingsTemplate(templateId),
    queryFn: () => AdminRoyaltySettingsService.getTemplateRules(templateId || ""),
    enabled: Boolean(templateId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useUpdateArtistRoyaltyRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      artistId,
      data,
    }: {
      artistId: string;
      data: RoyaltyRuleInput;
    }) => AdminRoyaltySettingsService.updateArtistRule(artistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    },
  });
};

export const useUpdateTemplateRoyaltyRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      artistId,
      data,
    }: {
      templateId: string;
      artistId: string;
      data: RoyaltyRuleInput;
    }) =>
      AdminRoyaltySettingsService.updateTemplateRule(templateId, {
        ...data,
        artistId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    },
  });
};
