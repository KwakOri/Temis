import {
  convertDynamicCardsToTeamTimeTableData,
  Team,
  TeamSchedule,
  TeamTimeTableWeekData,
} from "@/types/team-timetable";
import { TDefaultCard } from "@/types/time-table/data";

export interface SaveTeamScheduleRequest {
  week_start_date: string;
  schedule_data: TeamTimeTableWeekData;
  team_id?: string; // Optional for permission check
}

export interface GetTeamSchedulesResponse {
  schedules: TeamSchedule[];
}

export interface GetUserTeamsResponse {
  teams: Team[];
}

export class TeamService {
  private static baseUrl = "/api/team";

  /**
   * 사용자가 속한 팀 목록 조회
   */
  static async getUserTeams(): Promise<GetUserTeamsResponse> {
    const response = await fetch(`${this.baseUrl}/user-teams`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 목록을 가져올 수 없습니다.");
    }

    const teams = await response.json();
    return { teams };
  }

  /**
   * 팀 시간표 저장 (동적 카드 형식) - 통합된 메서드
   */
  static async saveTeamScheduleFromDynamicCards(
    weekStartDate: string,
    dynamicCards: TDefaultCard[],
    teamId?: string
  ): Promise<TeamSchedule> {
    // Convert dynamic cards to team schedule data (only time and mainTitle)
    const teamScheduleData =
      convertDynamicCardsToTeamTimeTableData(dynamicCards);

    const requestData: SaveTeamScheduleRequest = {
      week_start_date: weekStartDate,
      schedule_data: teamScheduleData,
      team_id: teamId, // Optional for permission check
    };

    const response = await fetch(`${this.baseUrl}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 시간표 저장에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 팀의 특정 주 시간표 조회 (deprecated - use getTeamSchedulesByWeek)
   */
  static async getTeamSchedules(
    teamId: string,
    weekStartDate: string
  ): Promise<GetTeamSchedulesResponse> {
    return this.getTeamSchedulesByWeek(teamId, weekStartDate).then(
      (schedules) => ({ schedules })
    );
  }

  /**
   * 사용자의 특정 주 시간표 조회
   */
  static async getUserTeamSchedule(
    weekStartDate: string,
    teamId?: string
  ): Promise<TeamSchedule | null> {
    const params = new URLSearchParams({
      week_start_date: weekStartDate,
    });

    if (teamId) {
      params.append("team_id", teamId);
    }

    const response = await fetch(`${this.baseUrl}/schedule/user?${params}`, {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "사용자 팀 시간표를 가져올 수 없습니다."
      );
    }

    return response.json();
  }

  /**
   * 팀 시간표 삭제
   */
  static async deleteTeamSchedule(scheduleId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/schedule/${scheduleId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 시간표 삭제에 실패했습니다.");
    }

    return true;
  }

  /**
   * 주 시작일 문자열 생성 (월요일 기준)
   */
  static getWeekStartDate(date: Date): string {
    const monday = new Date(date);
    const dayOfWeek = monday.getUTCDay(); // UTC 기준 요일: 0=일요일, 1=월요일, ..., 6=토요일

    // 가장 가까운 이전 월요일을 찾기
    // 일요일(0)이면 6일 전 월요일, 월요일(1)이면 0일, 화요일(2)이면 1일 전, ..., 토요일(6)이면 5일 전
    let daysToSubtract;
    if (dayOfWeek === 0) {
      daysToSubtract = 6; // 일요일이면 6일 전 월요일
    } else {
      daysToSubtract = dayOfWeek - 1; // 다른 요일은 (요일번호 - 1)일 전 월요일
    }

    monday.setUTCDate(monday.getUTCDate() - daysToSubtract);

    return monday.toISOString().split("T")[0]; // YYYY-MM-DD 형식
  }

  /**
   * 날짜 문자열을 주 시작일로 변환
   */
  static getWeekStartDateFromString(dateStr: string): string {
    const date = new Date(dateStr);
    return this.getWeekStartDate(date);
  }

  /**
   * 특정 팀의 특정 주차 시간표 조회 (모든 멤버)
   */
  static async getTeamSchedulesByWeek(
    teamId: string,
    weekStartDate: string
  ): Promise<TeamSchedule[]> {
    const response = await fetch(
      `${this.baseUrl}/schedules/${teamId}/week/${weekStartDate}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 시간표를 가져올 수 없습니다.");
    }

    const data = await response.json();
    return data;
  }

  /**
   * 사용자의 모든 시간표 주차 목록 조회
   */
  static async getUserScheduleWeeks(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/schedule/user/weeks`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "사용자 시간표 주차 목록을 가져올 수 없습니다."
      );
    }

    const data = await response.json();
    return data.weeks;
  }
}
