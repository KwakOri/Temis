import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminThumbnailService } from "@/services/admin/thumbnailService";

const thumbnailsKey = ["admin", "thumbnails"] as const;

export function useAdminThumbnails(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: [...thumbnailsKey, params],
    queryFn: () => AdminThumbnailService.getThumbnails(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRenameAdminThumbnail() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      AdminThumbnailService.updateThumbnail(id, { name }),
    onSuccess: () => client.invalidateQueries({ queryKey: thumbnailsKey }),
  });
}
