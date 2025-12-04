import { queryKeys } from "@/lib/queryKeys";
import {
  AdminTeamTemplateService,
  ConnectTeamData,
  CreateTeamTemplateData,
} from "@/services/admin/teamTemplateService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminTeamTemplates = (params?: {
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: [...queryKeys.admin.teamTemplates(), params],
    queryFn: () => AdminTeamTemplateService.getTeamTemplates(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateTeamTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeamTemplateData) =>
      AdminTeamTemplateService.createTeamTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.teamTemplates(),
      });
    },
  });
};

export const useConnectTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamTemplateId,
      data,
    }: {
      teamTemplateId: string;
      data: ConnectTeamData;
    }) => AdminTeamTemplateService.connectTeam(teamTemplateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.teamTemplates(),
      });
    },
  });
};

export const useDisconnectTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamTemplateId,
      teamId,
    }: {
      teamTemplateId: string;
      teamId: string;
    }) => AdminTeamTemplateService.disconnectTeam(teamTemplateId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.teamTemplates(),
      });
    },
  });
};

export const useAdminTeams = () => {
  return useQuery({
    queryKey: queryKeys.admin.teams(),
    queryFn: () => AdminTeamTemplateService.getTeams(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
