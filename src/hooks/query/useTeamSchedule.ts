import { teamScheduleService, Team, TeamScheduleData } from "@/services/client/teamScheduleService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// 사용자가 속한 팀 목록 조회
export const useUserTeams = () => {
  return useQuery({
    queryKey: ['teams', 'user'],
    queryFn: () => teamScheduleService.getUserTeams(),
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// 팀 시간표 저장
export const useSaveTeamSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TeamScheduleData, 'id' | 'created_at' | 'updated_at'>) =>
      teamScheduleService.saveTeamSchedule(data),
    onSuccess: (data) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['teamSchedules', data.team_id] });
      queryClient.invalidateQueries({ queryKey: ['userTeamSchedule', data.team_id] });
    },
  });
};

// 팀 시간표 수정
export const useUpdateTeamSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<TeamScheduleData> }) =>
      teamScheduleService.updateTeamSchedule(scheduleId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teamSchedules', data.team_id] });
      queryClient.invalidateQueries({ queryKey: ['userTeamSchedule', data.team_id] });
    },
  });
};

// 팀 시간표 삭제
export const useDeleteTeamSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) =>
      teamScheduleService.deleteTeamSchedule(scheduleId),
    onSuccess: () => {
      // 모든 팀 스케줄 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['teamSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['userTeamSchedule'] });
    },
  });
};

// 특정 팀의 특정 주차 시간표 목록 조회
export const useTeamSchedules = (teamId: string, weekStartDate: string, enabled = true) => {
  return useQuery({
    queryKey: ['teamSchedules', teamId, weekStartDate],
    queryFn: () => teamScheduleService.getTeamSchedules(teamId, weekStartDate),
    enabled: enabled && !!teamId && !!weekStartDate,
    staleTime: 2 * 60 * 1000, // 2분
  });
};

// 특정 팀의 여러 주차 시간표 조회
export const useTeamSchedulesByDateRange = (
  teamId: string,
  startDate: string,
  endDate: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ['teamSchedules', teamId, 'range', startDate, endDate],
    queryFn: () => teamScheduleService.getTeamSchedulesByDateRange(teamId, startDate, endDate),
    enabled: enabled && !!teamId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2분
  });
};

// 사용자의 팀 시간표 조회 (특정 주차)
export const useUserTeamSchedule = (teamId: string, weekStartDate: string, enabled = true) => {
  return useQuery({
    queryKey: ['userTeamSchedule', teamId, weekStartDate],
    queryFn: () => teamScheduleService.getUserTeamSchedule(teamId, weekStartDate),
    enabled: enabled && !!teamId && !!weekStartDate,
    staleTime: 2 * 60 * 1000, // 2분
  });
};