import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/supabase";
import { Team, TeamMember, TeamMemberWithUser, TeamWithMembers } from "@/types/team-timetable";

export class TeamService {
  /**
   * 모든 팀 조회 (관리자용)
   */
  static async getAllTeams(): Promise<TeamWithMembers[]> {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members (
            id,
            team_id,
            user_id,
            role,
            joined_at,
            created_at,
            updated_at,
            users (
              id,
              name,
              email
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data.map((team) => ({
        ...team,
        members: team.team_members || [],
        memberCount: team.team_members?.length || 0,
      }));
    } catch (error) {
      console.error("Error fetching all teams:", error);
      throw new Error("팀 목록을 가져오는데 실패했습니다.");
    }
  }

  /**
   * 팀 생성
   */
  static async createTeam(data: {
    name: string;
    description?: string;
    created_by: number;
  }): Promise<Team> {
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .insert({
          name: data.name,
          description: data.description,
          created_by: data.created_by,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return team;
    } catch (error) {
      console.error("Error creating team:", error);
      throw new Error("팀 생성에 실패했습니다.");
    }
  }

  /**
   * 팀 수정
   */
  static async updateTeam(
    teamId: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<Team> {
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return team;
    } catch (error) {
      console.error("Error updating team:", error);
      throw new Error("팀 정보 수정에 실패했습니다.");
    }
  }

  /**
   * 팀 삭제
   */
  static async deleteTeam(teamId: string): Promise<boolean> {
    try {
      // First delete all team members
      const { error: membersError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId);

      if (membersError) {
        throw membersError;
      }

      // Then delete all team schedules
      const { error: schedulesError } = await supabase
        .from("team_schedules")
        .delete()
        .eq("team_id", teamId);

      if (schedulesError) {
        throw schedulesError;
      }

      // Finally delete the team
      const { error: teamError } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (teamError) {
        throw teamError;
      }

      return true;
    } catch (error) {
      console.error("Error deleting team:", error);
      throw new Error("팀 삭제에 실패했습니다.");
    }
  }

  /**
   * 특정 팀 조회
   */
  static async getTeamById(teamId: string): Promise<TeamWithMembers | null> {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members (
            id,
            team_id,
            user_id,
            role,
            joined_at,
            created_at,
            updated_at,
            users (
              id,
              name,
              email
            )
          )
        `)
        .eq("id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return {
        ...data,
        members: (data.team_members || []) as TeamMemberWithUser[],
        memberCount: data.team_members?.length || 0,
      };
    } catch (error) {
      console.error("Error fetching team:", error);
      throw new Error("팀 정보를 가져오는데 실패했습니다.");
    }
  }

  /**
   * 팀 멤버 추가
   */
  static async addTeamMember(data: {
    team_id: string;
    user_id: number;
    role: "manager" | "member";
  }): Promise<TeamMember> {
    try {
      // Check if user is already a member
      const { data: existingMember, error: checkError } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", data.team_id)
        .eq("user_id", data.user_id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingMember) {
        throw new Error("이미 팀의 멤버입니다.");
      }

      // Add member
      const { data: member, error } = await supabase
        .from("team_members")
        .insert({
          team_id: data.team_id,
          user_id: data.user_id,
          role: data.role,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return member;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error instanceof Error ? error : new Error("팀 멤버 추가에 실패했습니다.");
    }
  }

  /**
   * 팀 멤버 역할 변경
   */
  static async updateTeamMemberRole(
    memberId: string,
    role: "manager" | "member"
  ): Promise<TeamMember> {
    try {
      const { data: member, error } = await supabase
        .from("team_members")
        .update({ role })
        .eq("id", memberId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return member;
    } catch (error) {
      console.error("Error updating team member role:", error);
      throw new Error("팀 멤버 역할 변경에 실패했습니다.");
    }
  }

  /**
   * 팀 멤버 제거
   */
  static async removeTeamMember(memberId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error removing team member:", error);
      throw new Error("팀 멤버 제거에 실패했습니다.");
    }
  }

  /**
   * 사용자 검색 (팀 멤버 추가 시 사용)
   */
  static async searchUsers(query: string): Promise<Pick<Tables<"users">, "id" | "name" | "email">[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error searching users:", error);
      throw new Error("사용자 검색에 실패했습니다.");
    }
  }

  /**
   * 팀의 멤버 목록 조회
   */
  static async getTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          users (
            id,
            name,
            email
          )
        `)
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching team members:", error);
      throw new Error("팀 멤버 목록을 가져오는데 실패했습니다.");
    }
  }

  /**
   * 사용자가 속한 팀 목록 조회 (기존 기능과 동일하지만 teamService로 이동)
   */
  static async getUserTeams(userId: number): Promise<Team[]> {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          teams (
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      const teams = data
        .map((item) => item.teams)
        .filter((team): team is Tables<"teams"> => team !== null)
        .map((team) => ({
          id: team.id,
          name: team.name,
          description: team.description,
          created_by: team.created_by,
          created_at: team.created_at,
          updated_at: team.updated_at,
        }));

      return teams;
    } catch (error) {
      console.error("Error fetching user teams:", error);
      throw new Error("팀 목록을 가져오는데 실패했습니다.");
    }
  }
}

export const teamService = TeamService;