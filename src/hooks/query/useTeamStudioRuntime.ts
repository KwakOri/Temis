import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TeamStudioRuntimeService } from "@/services/teamStudioRuntimeService";

export const teamStudioRuntimeKeys = {
  all: ["team-studio-runtime"] as const,
  options: (userId: string) =>
    ["team-studio-runtime", userId, "options"] as const,
  week: (userId: string, templateId: string, teamId: string, week: string) =>
    ["team-studio-runtime", userId, "week", templateId, teamId, week] as const,
};
export const useTeamStudioOptions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: teamStudioRuntimeKeys.options(user?.id ?? "anonymous"),
    queryFn: TeamStudioRuntimeService.options,
    enabled: Boolean(user),
    staleTime: 60000,
  });
};
export const useTeamStudioWeek = (
  templateId: string,
  teamId: string,
  weekStartDate: string,
) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: teamStudioRuntimeKeys.week(
      user?.id ?? "anonymous",
      templateId,
      teamId,
      weekStartDate,
    ),
    queryFn: () =>
      TeamStudioRuntimeService.week(templateId, teamId, weekStartDate),
    enabled: Boolean(user && templateId && teamId && weekStartDate),
    staleTime: 60000,
  });
};
