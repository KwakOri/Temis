import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TeamStudioConnectionService } from "@/services/admin/teamStudioConnectionService";
import { teamStudioRuntimeKeys } from "./useTeamStudioRuntime";

export const teamStudioConnectionKeys = {
  all: ["admin", "team-studio-connections"] as const,
  detail: (userId: string, id: string) =>
    ["admin", "team-studio-connections", userId, id] as const,
  week: (userId: string, id: string, teamId: string, week: string) =>
    [
      "admin",
      "team-studio-connections",
      userId,
      id,
      "week",
      teamId,
      week,
    ] as const,
};
export function useTeamStudioConnection(id: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: teamStudioConnectionKeys.detail(user?.id ?? "anonymous", id),
    queryFn: () => TeamStudioConnectionService.get(id),
    enabled: Boolean(user && id && enabled),
    staleTime: 60000,
  });
}
export function useAdminTeamStudioWeek(
  id: string,
  teamId: string,
  week: string,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: teamStudioConnectionKeys.week(
      user?.id ?? "anonymous",
      id,
      teamId,
      week,
    ),
    queryFn: () => TeamStudioConnectionService.week(id, teamId, week),
    enabled: Boolean(user && id && teamId && week),
    staleTime: 60000,
  });
}
export function useSaveTeamStudioConnection(id: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (
      payload: {
        teamId: string;
        memberBindings: Record<string, number>;
      } | null,
    ) =>
      payload
        ? TeamStudioConnectionService.save(
            id,
            payload.teamId,
            payload.memberBindings,
          )
        : TeamStudioConnectionService.disconnect(id),
    onSuccess: async (result) => {
      client.setQueryData(
        teamStudioConnectionKeys.detail(user?.id ?? "anonymous", id),
        result,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: teamStudioConnectionKeys.all }),
        client.invalidateQueries({ queryKey: teamStudioRuntimeKeys.all }),
      ]);
    },
  });
}
