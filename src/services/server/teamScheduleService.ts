import { supabase } from "@/lib/supabase";
import { Json, Tables } from "@/types/supabase";
import {
  normalizeTeamTimeTableData,
  Team,
  TeamSchedule,
  TeamScheduleWithUser,
  TeamTimeTableWeekData,
  UserScheduleData,
} from "@/types/team-timetable";

type TeamScheduleRow = Pick<
  Tables<"team_schedules">,
  | "id"
  | "user_id"
  | "week_start_date"
  | "schedule_data"
  | "created_at"
  | "updated_at"
>;

const normalizeScheduleDataOrThrow = (
  scheduleData: unknown
): TeamTimeTableWeekData => {
  const normalizedScheduleData = normalizeTeamTimeTableData(scheduleData);

  if (!normalizedScheduleData) {
    throw new Error("유효하지 않은 시간표 데이터입니다.");
  }

  return normalizedScheduleData;
};

const toTeamSchedule = (schedule: TeamScheduleRow): TeamSchedule => ({
  id: schedule.id,
  user_id: schedule.user_id,
  week_start_date: schedule.week_start_date,
  schedule_data: normalizeScheduleDataOrThrow(schedule.schedule_data),
  created_at: schedule.created_at,
  updated_at: schedule.updated_at,
});

export class TeamScheduleService {
  /**
   * 사용자가 속한 팀 목록 조회 (템플릿 정보 포함)
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
            is_active,
            created_at,
            updated_at,
            relations_team_template_and_team (
              team_template_id,
              team_templates (
                id,
                name,
                descriptions
              )
            )
          )
        `
        )
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      // Transform the data to extract teams with template info
      const teams = data
        .map((item) => item.teams)
        .filter((team): team is NonNullable<typeof team> => team !== null)
        .map((team) => {
          const relation = team.relations_team_template_and_team?.[0];
          const template = relation?.team_templates;

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            created_by: team.created_by,
            is_active: team.is_active,
            created_at: team.created_at,
            updated_at: team.updated_at,
            team_template: template ? {
              id: template.id,
              name: template.name,
              descriptions: template.descriptions,
            } : null,
          } as Team & { team_template: { id: string; name: string; descriptions: string | null } | null };
        });

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
    user_id: number;
    week_start_date: string;
    schedule_data: unknown;
    team_id?: string; // Optional for permission check
  }): Promise<TeamSchedule> {
    try {
      const normalizedScheduleData = normalizeScheduleDataOrThrow(
        data.schedule_data
      );

      // If team_id is provided, check if user is member of the team
      if (data.team_id) {
        const { data: memberCheck, error: memberError } = await supabase
          .from("team_members")
          .select("id")
          .eq("team_id", data.team_id)
          .eq("user_id", data.user_id)
          .single();

        if (memberError || !memberCheck) {
          throw new Error("해당 팀의 멤버가 아닙니다.");
        }
      }

      // Check if schedule already exists for this week
      const { data: existingSchedule, error: existingError } = await supabase
        .from("team_schedules")
        .select("id")
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
            schedule_data: normalizedScheduleData as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSchedule.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return toTeamSchedule(updatedSchedule);
      } else {
        // Create new schedule
        const { data: newSchedule, error: insertError } = await supabase
          .from("team_schedules")
          .insert({
            user_id: data.user_id,
            week_start_date: data.week_start_date,
            schedule_data: normalizedScheduleData as unknown as Json,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        return toTeamSchedule(newSchedule);
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
   * 1. 팀 멤버 목록 조회
   * 2. 해당 멤버들의 시간표 조회
   */
  static async getTeamSchedules(
    teamId: string,
    weekStartDate: string
  ): Promise<TeamSchedule[]> {
    try {
      // 1. Get team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (membersError) {
        throw membersError;
      }

      if (!members || members.length === 0) {
        return [];
      }

      const userIds = members.map((m) => m.user_id);

      // 2. Get schedules for these users
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
        .in("user_id", userIds)
        .eq("week_start_date", weekStartDate);

      if (error) {
        throw error;
      }

      return data.map(toTeamSchedule);
    } catch (error) {
      console.error("Error fetching team schedules:", error);
      throw new Error("팀 시간표를 가져오는데 실패했습니다.");
    }
  }

  /**
   * 사용자의 특정 주 시간표 조회
   * teamId는 선택적으로 권한 확인용으로만 사용
   */
  static async getUserTeamSchedule(
    userId: number,
    weekStartDate: string,
    teamId?: string
  ): Promise<TeamSchedule | null> {
    try {
      // If teamId is provided, verify user is a member of the team
      if (teamId) {
        const { data: memberCheck, error: memberError } = await supabase
          .from("team_members")
          .select("id")
          .eq("team_id", teamId)
          .eq("user_id", userId)
          .single();

        if (memberError || !memberCheck) {
          throw new Error("해당 팀의 멤버가 아닙니다.");
        }
      }

      const { data, error } = await supabase
        .from("team_schedules")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start_date", weekStartDate)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return toTeamSchedule(data);
    } catch (error) {
      console.error("Error fetching user team schedule:", error);
      throw error instanceof Error
        ? error
        : new Error("사용자 팀 시간표를 가져오는데 실패했습니다.");
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

  /**
   * 여러 유저의 특정 주 시간표 조회
   * userIds 배열의 순서대로 정렬하여 반환
   * 각 user_id에 대해 데이터 존재 여부와 함께 래핑하여 반환
   */
  static async getMultipleUserSchedules(
    userIds: number[],
    weekStartDate: string
  ): Promise<UserScheduleData[]> {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

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
        .in("user_id", userIds)
        .eq("week_start_date", weekStartDate);

      if (error) {
        throw error;
      }

      // 스케줄 데이터를 user_id를 키로 하는 Map으로 변환
      const scheduleMap = new Map<number, TeamScheduleWithUser>();
      data.forEach((schedule) => {
        scheduleMap.set(schedule.user_id, {
          ...toTeamSchedule(schedule),
          user: schedule.users
            ? {
                id: (schedule.users as { id: number }).id,
                name: (schedule.users as { name: string | null }).name,
                email: (schedule.users as { email: string | null }).email,
              }
            : null,
        });
      });

      // userIds 배열의 순서대로 각 user_id에 대해 래핑된 데이터 생성
      const wrappedSchedules: UserScheduleData[] = userIds.map((userId) => {
        const schedule = scheduleMap.get(userId);
        return {
          user_id: userId,
          success: !!schedule,
          schedule: schedule || null,
        };
      });

      return wrappedSchedules;
    } catch (error) {
      console.error("Error fetching multiple user schedules:", error);
      throw new Error("여러 유저의 시간표를 가져오는데 실패했습니다.");
    }
  }

  /**
   * 사용자의 모든 시간표 주차 조회 (week_start_date만 반환)
   */
  static async getUserScheduleWeeks(userId: number): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("team_schedules")
        .select("week_start_date")
        .eq("user_id", userId)
        .order("week_start_date", { ascending: true });

      if (error) {
        throw error;
      }

      return data.map((schedule) => schedule.week_start_date);
    } catch (error) {
      console.error("Error fetching user schedule weeks:", error);
      throw new Error("사용자 시간표 주차 목록을 가져오는데 실패했습니다.");
    }
  }
}

export const teamScheduleService = TeamScheduleService;
