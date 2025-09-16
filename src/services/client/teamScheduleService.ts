import { Json } from "@/types/supabase";

export interface TeamScheduleData {
  id?: string;
  team_id: string;
  user_id: number;
  week_start_date: string;
  schedule_data: Json;
  profile_image_url?: string;
  theme?: 'blue' | 'pink' | 'yellow';
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: number;
  role: 'admin' | 'member';
  joined_at?: string;
  created_at?: string;
  updated_at?: string;
}

class TeamScheduleService {
  /**
   * 사용자가 속한 팀 목록 조회
   */
  async getUserTeams(): Promise<Team[]> {
    const response = await fetch('/api/team/user-teams', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('팀 목록을 가져오는데 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 팀 시간표 저장
   */
  async saveTeamSchedule(data: Omit<TeamScheduleData, 'id' | 'created_at' | 'updated_at'>): Promise<TeamScheduleData> {
    const response = await fetch('/api/team/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('팀 시간표 저장에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 팀 시간표 수정
   */
  async updateTeamSchedule(scheduleId: string, data: Partial<TeamScheduleData>): Promise<TeamScheduleData> {
    const response = await fetch(`/api/team/schedule/${scheduleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('팀 시간표 수정에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 팀 시간표 삭제
   */
  async deleteTeamSchedule(scheduleId: string): Promise<void> {
    const response = await fetch(`/api/team/schedule/${scheduleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('팀 시간표 삭제에 실패했습니다.');
    }
  }

  /**
   * 특정 팀의 특정 주차 시간표 목록 조회
   */
  async getTeamSchedules(teamId: string, weekStartDate: string): Promise<TeamScheduleData[]> {
    const params = new URLSearchParams({
      team_id: teamId,
      week_start_date: weekStartDate,
    });

    const response = await fetch(`/api/team/schedules?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('팀 시간표를 가져오는데 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 특정 팀의 여러 주차 시간표 조회
   */
  async getTeamSchedulesByDateRange(
    teamId: string,
    startDate: string,
    endDate: string
  ): Promise<TeamScheduleData[]> {
    const params = new URLSearchParams({
      team_id: teamId,
      start_date: startDate,
      end_date: endDate,
    });

    const response = await fetch(`/api/team/schedules/range?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('팀 시간표 범위 조회에 실패했습니다.');
    }

    return response.json();
  }

  /**
   * 사용자의 팀 시간표 조회 (특정 주차)
   */
  async getUserTeamSchedule(teamId: string, weekStartDate: string): Promise<TeamScheduleData | null> {
    const params = new URLSearchParams({
      team_id: teamId,
      week_start_date: weekStartDate,
    });

    const response = await fetch(`/api/team/schedule/user?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('사용자 팀 시간표를 가져오는데 실패했습니다.');
    }

    return response.json();
  }
}

export const teamScheduleService = new TeamScheduleService();