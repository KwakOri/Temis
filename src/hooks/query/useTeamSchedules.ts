import { useQuery } from "@tanstack/react-query";
import { teamScheduleClientService } from "@/services/teamScheduleService";
import { TeamSchedulesResponse } from "@/types/team-timetable";

// Query Keys
export const TEAM_SCHEDULES_QUERY_KEYS = {
  all: ["team", "schedules"] as const,
  batch: (userIds: number[], weekStartDate: string) =>
    [...TEAM_SCHEDULES_QUERY_KEYS.all, "batch", { userIds, weekStartDate }] as const,
};

// 여러 유저의 팀 스케줄 조회
export const useTeamBatchSchedules = (
  userIds: number[],
  weekStartDate: string,
  enabled = true
) => {
  return useQuery<TeamSchedulesResponse, Error>({
    queryKey: TEAM_SCHEDULES_QUERY_KEYS.batch(userIds, weekStartDate),
    queryFn: () =>
      teamScheduleClientService.getBatchSchedules(userIds, weekStartDate),
    enabled: enabled && userIds.length > 0 && !!weekStartDate,
    staleTime: 2 * 60 * 1000, // 2분
  });
};
