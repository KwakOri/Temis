import { TeamSchedulesResponse } from "@/types/team-timetable";

export class TeamScheduleClientService {
  private static baseUrl = "/api/team/schedules";

  /**
   * 여러 유저의 특정 주 시간표 조회
   */
  static async getBatchSchedules(
    userIds: number[],
    weekStartDate: string
  ): Promise<TeamSchedulesResponse> {
    const params = new URLSearchParams({
      user_ids: userIds.join(","),
      week_start_date: weekStartDate,
    });

    const response = await fetch(`${this.baseUrl}/batch?${params}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "팀 시간표를 가져오는데 실패했습니다."
      );
    }

    const data = await response.json();
    return {
      schedules: data.schedules || [],
      userIds: data.userIds || userIds,
      weekStartDate: data.weekStartDate || weekStartDate,
    };
  }
}

export const teamScheduleClientService = TeamScheduleClientService;
