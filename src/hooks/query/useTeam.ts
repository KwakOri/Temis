import { queryKeys } from "@/lib/queryKeys";
import { TeamService } from "@/services/teamService";
import { TeamSchedule } from "@/types/team-timetable";
import { TDefaultCard } from "@/types/time-table/data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * 사용자가 속한 팀 목록 조회 훅
 */
export function useUserTeams() {
  return useQuery({
    queryKey: queryKeys.team.userTeams(),
    queryFn: async () => {
      const response = await TeamService.getUserTeams();
      return response.teams;
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 메모리 보관
  });
}

/**
 * 팀의 특정 주 시간표 조회 훅
 */
export function useTeamSchedules(teamId: string, weekStartDate: string) {
  return useQuery({
    queryKey: queryKeys.team.schedules(teamId, weekStartDate),
    queryFn: async () => {
      const response = await TeamService.getTeamSchedules(
        teamId,
        weekStartDate
      );
      return response.schedules;
    },
    enabled: !!teamId && !!weekStartDate, // teamId와 weekStartDate가 있을 때만 실행
    staleTime: 2 * 60 * 1000, // 2분간 캐시 유지
    gcTime: 5 * 60 * 1000, // 5분간 메모리 보관
  });
}

/**
 * 사용자의 특정 팀 시간표 조회 훅
 * teamId는 캐시 키와 권한 검증용으로 사용
 */
export function useUserTeamSchedule(teamId: string, weekStartDate: string) {
  return useQuery({
    queryKey: queryKeys.team.userSchedule(teamId, weekStartDate),
    queryFn: async () => {
      return await TeamService.getUserTeamSchedule(weekStartDate, teamId);
    },
    enabled: !!teamId && !!weekStartDate, // teamId와 weekStartDate가 있을 때만 실행
    staleTime: 1 * 60 * 1000, // 1분간 캐시 유지
    gcTime: 3 * 60 * 1000, // 3분간 메모리 보관
  });
}

/**
 * 팀 시간표 저장 훅 (동적 카드 형식)
 */
export function useSaveTeamScheduleFromDynamicCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      weekStartDate,
      dynamicCards,
    }: {
      teamId?: string;
      weekStartDate: string;
      dynamicCards: TDefaultCard[];
    }) => {
      return await TeamService.saveTeamScheduleFromDynamicCards(
        weekStartDate,
        dynamicCards,
        teamId
      );
    },
    onSuccess: (data: TeamSchedule, variables) => {
      // 캐시 무효화 및 업데이트
      // teamId가 있는 경우에만 캐시 무효화
      if (variables.teamId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.team.schedules(
            variables.teamId,
            data.week_start_date
          ),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.team.userSchedule(
            variables.teamId,
            data.week_start_date
          ),
        });

        // 새로운 데이터로 캐시 업데이트
        queryClient.setQueryData(
          queryKeys.team.userSchedule(
            variables.teamId,
            data.week_start_date
          ),
          data
        );
      }

      // ImageSaveModal에서 사용하는 쿼리 무효화 (["userSchedule", weekStartDate] 형식)
      queryClient.invalidateQueries({
        queryKey: ["userSchedule", data.week_start_date],
      });

      // 모든 팀 관련 쿼리 무효화 (teamId가 없는 경우를 대비)
      queryClient.invalidateQueries({
        queryKey: queryKeys.team.all,
      });

      // 일반적인 userSchedule 쿼리도 무효화
      queryClient.invalidateQueries({
        queryKey: ["userSchedule"],
      });
    },
    onError: (error: Error) => {
      console.error("팀 시간표 저장 실패:", error);
    },
  });
}

/**
 * 팀 시간표 삭제 훅
 */
export function useDeleteTeamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      teamId,
      weekStartDate,
    }: {
      scheduleId: string;
      teamId: string;
      weekStartDate: string;
    }) => {
      return await TeamService.deleteTeamSchedule(scheduleId);
    },
    onSuccess: (_, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.team.schedules(
          variables.teamId,
          variables.weekStartDate
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.team.userSchedule(
          variables.teamId,
          variables.weekStartDate
        ),
      });

      // 사용자 스케줄 캐시에서 제거
      queryClient.setQueryData(
        queryKeys.team.userSchedule(variables.teamId, variables.weekStartDate),
        null
      );
    },
    onError: (error: Error) => {
      console.error("팀 시간표 삭제 실패:", error);
    },
  });
}

/**
 * 특정 팀의 특정 주차 시간표 조회 훅 (모든 멤버)
 */
export function useTeamSchedulesByWeek(teamId: string, weekStartDate: string) {
  return useQuery({
    queryKey: queryKeys.team.schedulesByWeek(teamId, weekStartDate),
    queryFn: async () => {
      return await TeamService.getTeamSchedulesByWeek(teamId, weekStartDate);
    },
    enabled: !!teamId && !!weekStartDate, // teamId와 weekStartDate가 있을 때만 실행
    staleTime: 2 * 60 * 1000, // 2분간 캐시 유지
    gcTime: 5 * 60 * 1000, // 5분간 메모리 보관
  });
}

/**
 * 팀 관련 캐시 무효화 유틸리티 훅
 */
export function useInvalidateTeamQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateUserTeams: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.team.userTeams(),
      });
    },
    invalidateTeamSchedules: (teamId: string, weekStartDate: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.team.schedules(teamId, weekStartDate),
      });
    },
    invalidateUserSchedule: (teamId: string, weekStartDate: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.team.userSchedule(teamId, weekStartDate),
      });
    },
    invalidateAllTeamQueries: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.team.all,
      });
    },
  };
}

/**
 * 사용자가 활성화된 팀에 속해있는지 확인하는 훅
 * 하나 이상의 활성화된 팀(is_active = true)이 있으면 true 반환
 */
export function useHasActiveTeam() {
  return useQuery({
    queryKey: [...queryKeys.team.userTeams(), "hasActive"],
    queryFn: async () => {
      const response = await TeamService.getUserTeams();
      const hasActiveTeam = response.teams.some((team) => team.is_active);
      return hasActiveTeam;
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 메모리 보관
  });
}

/**
 * 사용자의 모든 시간표 주차 목록 조회 훅
 */
export function useUserScheduleWeeks() {
  return useQuery({
    queryKey: [...queryKeys.team.all, "scheduleWeeks"],
    queryFn: async () => {
      return await TeamService.getUserScheduleWeeks();
    },
    staleTime: 2 * 60 * 1000, // 2분간 캐시 유지
    gcTime: 5 * 60 * 1000, // 5분간 메모리 보관
  });
}
