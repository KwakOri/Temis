import { useTeamSchedulesByWeek } from "@/hooks/useTeam";

interface UseTeamTimeTableEditorProps {
  teamId: string;
  weekStartDate: string;
}

/**
 * 팀 시간표 에디터를 위한 훅
 * DB에서 팀 시간표 데이터를 직접 반환 (복잡한 변환 없이)
 */
export function useTeamTimeTableEditor({
  teamId,
  weekStartDate,
}: UseTeamTimeTableEditorProps) {
  const {
    data: teamSchedules,
    isLoading,
    error: queryError,
    refetch,
  } = useTeamSchedulesByWeek(teamId, weekStartDate);

  return {
    data: teamSchedules || [],
    isLoading,
    isInitialized: !isLoading,
    error:
      queryError instanceof Error
        ? queryError.message
        : queryError
        ? "데이터를 불러오는데 실패했습니다."
        : null,
    refetch,
    isEmpty: !teamSchedules || teamSchedules.length === 0,
  };
}
