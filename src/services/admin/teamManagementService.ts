import { Team, TeamMember, TeamMemberWithUser, TeamWithMembers } from "@/types/team-timetable";
import { Tables } from "@/types/supabase";

// API 응답 타입 정의
interface GetAllTeamsResponse {
  success: boolean;
  teams: TeamWithMembers[];
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface AddTeamMemberRequest {
  user_id: number;
  role: "manager" | "member";
}

export interface UpdateMemberRoleRequest {
  role: "manager" | "member";
}

export class TeamManagementService {
  private static baseUrl = "/api/admin";

  /**
   * 모든 팀 조회 (관리자용)
   */
  static async getAllTeams(): Promise<TeamWithMembers[]> {
    const response = await fetch(`${this.baseUrl}/teams`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 목록을 가져올 수 없습니다.");
    }

    const data: GetAllTeamsResponse = await response.json();
    return data.teams || [];
  }

  /**
   * 팀 생성
   */
  static async createTeam(data: CreateTeamRequest): Promise<Team> {
    const response = await fetch(`${this.baseUrl}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 생성에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 팀 정보 수정
   */
  static async updateTeam(
    teamId: string,
    data: UpdateTeamRequest
  ): Promise<Team> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 정보 수정에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 팀 삭제
   */
  static async deleteTeam(teamId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 삭제에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 특정 팀 조회
   */
  static async getTeamById(teamId: string): Promise<TeamWithMembers> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 정보를 가져올 수 없습니다.");
    }

    return response.json();
  }

  /**
   * 팀 멤버 목록 조회
   */
  static async getTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}/members`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 멤버 목록을 가져올 수 없습니다.");
    }

    return response.json();
  }

  /**
   * 팀 멤버 추가
   */
  static async addTeamMember(
    teamId: string,
    data: AddTeamMemberRequest
  ): Promise<TeamMember> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 멤버 추가에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 팀 멤버 역할 변경
   */
  static async updateMemberRole(
    teamId: string,
    memberId: string,
    data: UpdateMemberRoleRequest
  ): Promise<TeamMember> {
    const response = await fetch(
      `${this.baseUrl}/teams/${teamId}/members/${memberId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 멤버 역할 변경에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 팀 멤버 제거
   */
  static async removeTeamMember(
    teamId: string,
    memberId: string
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${this.baseUrl}/teams/${teamId}/members/${memberId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 멤버 제거에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 사용자 검색
   */
  static async searchUsers(query: string): Promise<Tables<"users">[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const params = new URLSearchParams({ q: query.trim() });
    const response = await fetch(`${this.baseUrl}/users/search?${params}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "사용자 검색에 실패했습니다.");
    }

    return response.json();
  }

  /**
   * 팀 활성화 상태 토글
   */
  static async toggleTeamActive(
    teamId: string,
    isActive: boolean
  ): Promise<Team> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "팀 활성화 상태 변경에 실패했습니다.");
    }

    return response.json();
  }
}

export const teamManagementService = TeamManagementService;