import {
  convertDynamicCardsToTeamTimeTableData,
  Team,
  TeamSchedule,
  TeamTimeTableWeekData,
} from "@/types/team-timetable";
import { TDefaultCard } from "@/types/time-table/data";

export interface SaveTeamScheduleRequest {
  team_id: string;
  week_start_date: string;
  schedule_data: TeamTimeTableWeekData;
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
    teamId: string,
    weekStartDate: string,
    dynamicCards: TDefaultCard[]
  ): Promise<TeamSchedule> {
    // Convert dynamic cards to team schedule data (only time and mainTitle)
    const teamScheduleData =
      convertDynamicCardsToTeamTimeTableData(dynamicCards);

    const requestData: SaveTeamScheduleRequest = {
      team_id: teamId,
      week_start_date: weekStartDate,
      schedule_data: teamScheduleData,
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
   * 팀의 특정 주 시간표 조회
   */
  static async getTeamSchedules(
    teamId: string,
    weekStartDate: string
  ): Promise<GetTeamSchedulesResponse> {
    const params = new URLSearchParams({
      team_id: teamId,
      week_start_date: weekStartDate,
    });

    const response = await fetch(`${this.baseUrl}/schedules?${params}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 시간표를 가져올 수 없습니다.");
    }

    const schedules = await response.json();
    return { schedules };
  }

  /**
   * 사용자의 특정 팀 시간표 조회
   */
  static async getUserTeamSchedule(
    teamId: string,
    weekStartDate: string
  ): Promise<TeamSchedule | null> {
    const params = new URLSearchParams({
      team_id: teamId,
      week_start_date: weekStartDate,
    });

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
    const dayOfWeek = monday.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 일요일(0)이면 -6, 다른 날은 1에서 dayOfWeek를 뺀 값
    monday.setDate(monday.getDate() + diffToMonday);

    return monday.toISOString().split("T")[0]; // YYYY-MM-DD 형식
  }

  /**
   * 날짜 문자열을 주 시작일로 변환
   */
  static getWeekStartDateFromString(dateStr: string): string {
    const date = new Date(dateStr);
    return this.getWeekStartDate(date);
  }
}
