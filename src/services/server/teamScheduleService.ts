import { supabase } from "@/lib/supabase";
import { Json, Tables } from "@/types/supabase";
import {
  Team,
  TeamSchedule,
  TeamTimeTableWeekData,
  validateTeamTimeTableData,
} from "@/types/team-timetable";

export class TeamScheduleService {
  /**
   * 사용자가 속한 팀 목록 조회
   */
  static async getUserTeams(userId: number): Promise<Team[]> {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          teams (
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at
          )
        `
        )
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      // Transform the data to extract teams
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

  /**
   * 팀 시간표 저장
   */
  static async createTeamSchedule(data: {
    team_id: string;
    user_id: number;
    week_start_date: string;
    schedule_data: TeamTimeTableWeekData;
  }): Promise<TeamSchedule> {
    try {
      // Validate schedule data
      if (!validateTeamTimeTableData(data.schedule_data)) {
        throw new Error("유효하지 않은 시간표 데이터입니다.");
      }

      // Check if user is member of the team
      const { data: memberCheck, error: memberError } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", data.team_id)
        .eq("user_id", data.user_id)
        .single();

      if (memberError || !memberCheck) {
        throw new Error("해당 팀의 멤버가 아닙니다.");
      }

      // Check if schedule already exists for this week
      const { data: existingSchedule, error: existingError } = await supabase
        .from("team_schedules")
        .select("id")
        .eq("team_id", data.team_id)
        .eq("user_id", data.user_id)
        .eq("week_start_date", data.week_start_date)
        .single();

      if (existingError && existingError.code !== "PGRST116") {
        throw existingError;
      }

      if (existingSchedule) {
        // Update existing schedule
        const { data: updatedSchedule, error: updateError } = await supabase
          .from("team_schedules")
          .update({
            schedule_data: data.schedule_data as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSchedule.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return {
          id: updatedSchedule.id,
          team_id: updatedSchedule.team_id,
          user_id: updatedSchedule.user_id,
          week_start_date: updatedSchedule.week_start_date,
          schedule_data:
            updatedSchedule.schedule_data as unknown as TeamTimeTableWeekData,
          created_at: updatedSchedule.created_at,
          updated_at: updatedSchedule.updated_at,
        };
      } else {
        // Create new schedule
        const { data: newSchedule, error: insertError } = await supabase
          .from("team_schedules")
          .insert({
            team_id: data.team_id,
            user_id: data.user_id,
            week_start_date: data.week_start_date,
            schedule_data: data.schedule_data as unknown as Json,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        return {
          id: newSchedule.id,
          team_id: newSchedule.team_id,
          user_id: newSchedule.user_id,
          week_start_date: newSchedule.week_start_date,
          schedule_data:
            newSchedule.schedule_data as unknown as TeamTimeTableWeekData,
          created_at: newSchedule.created_at,
          updated_at: newSchedule.updated_at,
        };
      }
    } catch (error) {
      console.error("Error creating/updating team schedule:", error);
      throw error instanceof Error
        ? error
        : new Error("팀 시간표 저장에 실패했습니다.");
    }
  }

  /**
   * 팀의 특정 주 시간표 조회
   */
  static async getTeamSchedules(
    teamId: string,
    weekStartDate: string
  ): Promise<TeamSchedule[]> {
    try {
      const { data, error } = await supabase
        .from("team_schedules")
        .select(
          `
          *,
          users (
            id,
            name,
            email
          )
        `
        )
        .eq("team_id", teamId)
        .eq("week_start_date", weekStartDate);

      if (error) {
        throw error;
      }

      return data.map((schedule) => ({
        id: schedule.id,
        team_id: schedule.team_id,
        user_id: schedule.user_id,
        week_start_date: schedule.week_start_date,
        schedule_data:
          schedule.schedule_data as unknown as TeamTimeTableWeekData,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
      }));
    } catch (error) {
      console.error("Error fetching team schedules:", error);
      throw new Error("팀 시간표를 가져오는데 실패했습니다.");
    }
  }

  /**
   * 사용자의 특정 팀 시간표 조회
   */
  static async getUserTeamSchedule(
    userId: number,
    teamId: string,
    weekStartDate: string
  ): Promise<TeamSchedule | null> {
    try {
      const { data, error } = await supabase
        .from("team_schedules")
        .select("*")
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .eq("week_start_date", weekStartDate)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return {
        id: data.id,
        team_id: data.team_id,
        user_id: data.user_id,
        week_start_date: data.week_start_date,
        schedule_data: data.schedule_data as unknown as TeamTimeTableWeekData,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error("Error fetching user team schedule:", error);
      throw new Error("사용자 팀 시간표를 가져오는데 실패했습니다.");
    }
  }

  /**
   * 팀 시간표 삭제
   */
  static async deleteTeamSchedule(
    scheduleId: string,
    userId: number
  ): Promise<boolean> {
    try {
      // Check if the schedule belongs to the user
      const { data: schedule, error: scheduleError } = await supabase
        .from("team_schedules")
        .select("user_id")
        .eq("id", scheduleId)
        .single();

      if (scheduleError || !schedule) {
        throw new Error("시간표를 찾을 수 없습니다.");
      }

      if (schedule.user_id !== userId) {
        throw new Error("해당 시간표를 삭제할 권한이 없습니다.");
      }

      const { error } = await supabase
        .from("team_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error deleting team schedule:", error);
      throw error instanceof Error
        ? error
        : new Error("팀 시간표 삭제에 실패했습니다.");
    }
  }
}

export const teamScheduleService = TeamScheduleService;
