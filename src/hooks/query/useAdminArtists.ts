import { queryKeys } from "@/lib/queryKeys";
import { AdminArtistService } from "@/services/admin/artistService";
import {
  CreateArtistData,
  TemplateArtistInput,
  UpdateArtistData,
} from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminArtists = (params?: {
  search?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: [...queryKeys.admin.artists(), params],
    queryFn: () => AdminArtistService.getArtists(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateAdminArtist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateArtistData) => AdminArtistService.createArtist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.artists() });
    },
  });
};

export const useUpdateAdminArtist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ artistId, data }: { artistId: string; data: UpdateArtistData }) =>
      AdminArtistService.updateArtist(artistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.artists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates() });
    },
  });
};

export const useDeleteAdminArtist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artistId: string) => AdminArtistService.deleteArtist(artistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.artists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates() });
    },
  });
};

export const useTemplateArtists = (templateId?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.templateArtists(templateId || ""),
    queryFn: () => AdminArtistService.getTemplateArtists(templateId!),
    enabled: !!templateId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useUpdateTemplateArtists = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      relations,
    }: {
      templateId: string;
      relations: TemplateArtistInput[];
    }) => AdminArtistService.updateTemplateArtists(templateId, relations),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.templateArtists(variables.templateId),
      });
    },
  });
};

