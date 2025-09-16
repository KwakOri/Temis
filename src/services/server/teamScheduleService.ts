import { createClient } from "@/lib/supabase/server";
import { Json, Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type TeamSchedule = Tables<'team_schedules'>;
export type TeamScheduleInsert = TablesInsert<'team_schedules'>;
export type TeamScheduleUpdate = TablesUpdate<'team_schedules'>;

export type Team = Tables<'teams'>;
export type TeamMember = Tables<'team_members'>;

export class TeamScheduleService {
  private supabase = createClient();

  /**
   * 사용자가 속한 팀 목록 조회
   */
  async getUserTeams(userId: number): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from('teams')
      .select('*')
      .in(
        'id',
        this.supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId)
      );

    if (error) {
      throw new Error(`팀 목록 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 팀 멤버 권한 확인
   */
  async checkTeamMembership(teamId: string, userId: number): Promise<TeamMember | null> {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 "not found" 에러
      throw new Error(`팀 멤버십 확인 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 팀 시간표 저장
   */
  async createTeamSchedule(data: TeamScheduleInsert): Promise<TeamSchedule> {
    // 팀 멤버십 확인
    const membership = await this.checkTeamMembership(data.team_id, data.user_id);
    if (!membership) {
      throw new Error('해당 팀의 멤버가 아닙니다.');
    }

    const { data: schedule, error } = await this.supabase
      .from('team_schedules')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`팀 시간표 저장 실패: ${error.message}`);
    }

    return schedule;
  }

  /**
   * 팀 시간표 수정
   */
  async updateTeamSchedule(scheduleId: string, userId: number, data: TeamScheduleUpdate): Promise<TeamSchedule> {
    // 기존 스케줄 조회 및 권한 확인
    const { data: existingSchedule, error: fetchError } = await this.supabase
      .from('team_schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      throw new Error(`팀 시간표 조회 실패: ${fetchError.message}`);
    }

    if (!existingSchedule) {
      throw new Error('수정 권한이 없습니다.');
    }

    const { data: schedule, error } = await this.supabase
      .from('team_schedules')
      .update(data)
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`팀 시간표 수정 실패: ${error.message}`);
    }

    return schedule;
  }

  /**
   * 팀 시간표 삭제
   */
  async deleteTeamSchedule(scheduleId: string, userId: number): Promise<void> {
    const { error } = await this.supabase
      .from('team_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`팀 시간표 삭제 실패: ${error.message}`);
    }
  }

  /**
   * 특정 팀의 특정 주차 시간표 목록 조회
   */
  async getTeamSchedules(teamId: string, weekStartDate: string, userId: number): Promise<TeamSchedule[]> {
    // 팀 멤버십 확인
    const membership = await this.checkTeamMembership(teamId, userId);
    if (!membership) {
      throw new Error('해당 팀의 멤버가 아닙니다.');
    }

    const { data, error } = await this.supabase
      .from('team_schedules')
      .select('*')
      .eq('team_id', teamId)
      .eq('week_start_date', weekStartDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`팀 시간표 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 특정 팀의 여러 주차 시간표 조회
   */
  async getTeamSchedulesByDateRange(
    teamId: string,
    startDate: string,
    endDate: string,
    userId: number
  ): Promise<TeamSchedule[]> {
    // 팀 멤버십 확인
    const membership = await this.checkTeamMembership(teamId, userId);
    if (!membership) {
      throw new Error('해당 팀의 멤버가 아닙니다.');
    }

    const { data, error } = await this.supabase
      .from('team_schedules')
      .select('*')
      .eq('team_id', teamId)
      .gte('week_start_date', startDate)
      .lte('week_start_date', endDate)
      .order('week_start_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`팀 시간표 범위 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 사용자의 특정 팀 시간표 조회 (특정 주차)
   */
  async getUserTeamSchedule(teamId: string, weekStartDate: string, userId: number): Promise<TeamSchedule | null> {
    // 팀 멤버십 확인
    const membership = await this.checkTeamMembership(teamId, userId);
    if (!membership) {
      throw new Error('해당 팀의 멤버가 아닙니다.');
    }

    const { data, error } = await this.supabase
      .from('team_schedules')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 "not found" 에러
      throw new Error(`사용자 팀 시간표 조회 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 팀의 모든 멤버 조회
   */
  async getTeamMembers(teamId: string, userId: number): Promise<TeamMember[]> {
    // 팀 멤버십 확인
    const membership = await this.checkTeamMembership(teamId, userId);
    if (!membership) {
      throw new Error('해당 팀의 멤버가 아닙니다.');
    }

    const { data, error } = await this.supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`팀 멤버 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 팀 시간표와 사용자 정보 조인 조회
   */
  async getTeamSchedulesWithUsers(teamId: string, weekStartDate: string, userId: number) {
    // 팀 멤버십 확인
    const membership = await this.checkTeamMembership(teamId, userId);
    if (!membership) {
      throw new Error('해당 팀의 멤버가 아닙니다.');
    }

    const { data, error } = await this.supabase
      .from('team_schedules')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq('team_id', teamId)
      .eq('week_start_date', weekStartDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`팀 시간표와 사용자 정보 조회 실패: ${error.message}`);
    }

    return data || [];
  }
}

export const teamScheduleService = new TeamScheduleService();