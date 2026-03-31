import { queryKeys } from "@/lib/queryKeys";
import { ArtistProfileService } from "@/services/artistProfileService";
import { TablesUpdate } from "@/types/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useArtistProfile = () => {
  return useQuery({
    queryKey: queryKeys.user.artistProfile(),
    queryFn: () => ArtistProfileService.getMyArtistProfile(),
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useUpdateArtistProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TablesUpdate<"artists">) =>
      ArtistProfileService.updateMyArtistProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.artistProfile() });
    },
  });
};
