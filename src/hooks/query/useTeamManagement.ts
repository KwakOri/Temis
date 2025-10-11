import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  teamManagementService,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
  UpdateMemberRoleRequest
} from "@/services/admin/teamManagementService";

// Query Keys
export const TEAM_MANAGEMENT_QUERY_KEYS = {
  all: ['admin', 'teams'] as const,
  lists: () => [...TEAM_MANAGEMENT_QUERY_KEYS.all, 'list'] as const,
  list: (filters: string) => [...TEAM_MANAGEMENT_QUERY_KEYS.lists(), { filters }] as const,
  details: () => [...TEAM_MANAGEMENT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TEAM_MANAGEMENT_QUERY_KEYS.details(), id] as const,
  members: (teamId: string) => [...TEAM_MANAGEMENT_QUERY_KEYS.detail(teamId), 'members'] as const,
  users: () => ['admin', 'users'] as const,
  userSearch: (query: string) => [...TEAM_MANAGEMENT_QUERY_KEYS.users(), 'search', query] as const,
};

// 모든 팀 조회 (관리자용)
export const useAllTeams = () => {
  return useQuery({
    queryKey: TEAM_MANAGEMENT_QUERY_KEYS.lists(),
    queryFn: () => teamManagementService.getAllTeams(),
    staleTime: 2 * 60 * 1000, // 2분
  });
};

// 특정 팀 조회
export const useTeamDetail = (teamId: string, enabled = true) => {
  return useQuery({
    queryKey: TEAM_MANAGEMENT_QUERY_KEYS.detail(teamId),
    queryFn: () => teamManagementService.getTeamById(teamId),
    enabled: enabled && !!teamId,
    staleTime: 2 * 60 * 1000, // 2분
  });
};

// 팀 멤버 목록 조회
export const useTeamMembers = (teamId: string, enabled = true) => {
  return useQuery({
    queryKey: TEAM_MANAGEMENT_QUERY_KEYS.members(teamId),
    queryFn: () => teamManagementService.getTeamMembers(teamId),
    enabled: enabled && !!teamId,
    staleTime: 2 * 60 * 1000, // 2분
  });
};

// 사용자 검색
export const useUserSearch = (query: string, enabled = true) => {
  return useQuery({
    queryKey: TEAM_MANAGEMENT_QUERY_KEYS.userSearch(query),
    queryFn: () => teamManagementService.searchUsers(query),
    enabled: enabled && !!query && query.trim().length >= 2,
    staleTime: 1 * 60 * 1000, // 1분
  });
};

// 팀 생성
export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeamRequest) => teamManagementService.createTeam(data),
    onSuccess: () => {
      // 팀 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.lists()
      });
    },
  });
};

// 팀 정보 수정
export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: UpdateTeamRequest }) =>
      teamManagementService.updateTeam(teamId, data),
    onSuccess: (data, variables) => {
      // 팀 목록과 상세 정보 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.lists()
      });
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.detail(variables.teamId)
      });
    },
  });
};

// 팀 삭제
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) => teamManagementService.deleteTeam(teamId),
    onSuccess: (data, teamId) => {
      // 팀 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.lists()
      });
      // 해당 팀 관련 쿼리 제거
      queryClient.removeQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.detail(teamId)
      });
    },
  });
};

// 팀 멤버 추가
export const useAddTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: AddTeamMemberRequest }) =>
      teamManagementService.addTeamMember(teamId, data),
    onSuccess: (data, variables) => {
      // 팀 목록, 상세 정보, 멤버 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.lists()
      });
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.detail(variables.teamId)
      });
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.members(variables.teamId)
      });
    },
  });
};

// 팀 멤버 역할 변경
export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      memberId,
      data
    }: {
      teamId: string;
      memberId: string;
      data: UpdateMemberRoleRequest
    }) => teamManagementService.updateMemberRole(teamId, memberId, data),
    onSuccess: (data, variables) => {
      // 팀 목록, 상세 정보, 멤버 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.lists()
      });
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.detail(variables.teamId)
      });
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.members(variables.teamId)
      });
    },
  });
};

// 팀 멤버 제거
export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      teamManagementService.removeTeamMember(teamId, memberId),
    onSuccess: (data, variables) => {
      // 팀 목록, 상세 정보, 멤버 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.lists()
      });
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.detail(variables.teamId)
      });
      queryClient.invalidateQueries({
        queryKey: TEAM_MANAGEMENT_QUERY_KEYS.members(variables.teamId)
      });
    },
  });
};