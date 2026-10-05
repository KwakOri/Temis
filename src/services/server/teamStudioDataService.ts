import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type {
  TeamStudioConnection,
  TeamStudioTeamWeek,
} from "@/types/team-studio-runtime";
import { normalizeTeamTimeTableData } from "@/types/team-timetable";
import { isTeamStudioMonday } from "@/utils/template-studio/team-runtime";

export const TEAM_STUDIO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class TeamStudioRuntimeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function isMissingTeamStudioConnections(
  error: { code?: string } | null,
) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}
export function assertTeamStudioStorage(error: { code?: string } | null) {
  if (isMissingTeamStudioConnections(error))
    throw new TeamStudioRuntimeError(
      503,
      "팀 연결 저장소가 준비되지 않았습니다. DB 마이그레이션 적용이 필요합니다.",
    );
  if (error) throw error;
}

export async function readTeamStudioConnection(
  db: SupabaseClient<Database>,
  templateId: string,
  requireStorage = false,
): Promise<TeamStudioConnection | null> {
  const result = await db
    .from("team_studio_connections")
    .select("template_id, team_id, member_bindings")
    .eq("template_id", templateId)
    .maybeSingle();
  // Preserve existing unassigned runtimes until the new migration is installed.
  if (!requireStorage && isMissingTeamStudioConnections(result.error))
    return null;
  assertTeamStudioStorage(result.error);
  if (!result.data) return null;
  return {
    templateId: result.data.template_id,
    teamId: result.data.team_id,
    memberBindings: result.data.member_bindings as Record<string, number>,
  };
}

export async function readTeamStudioTeamWeek(
  db: SupabaseClient<Database>,
  teamId: string,
  weekStartDate: string,
): Promise<TeamStudioTeamWeek> {
  if (!TEAM_STUDIO_UUID.test(teamId) || !isTeamStudioMonday(weekStartDate))
    throw new TeamStudioRuntimeError(
      400,
      "팀 ID와 월요일 날짜를 확인해 주세요.",
    );
  const team = await db
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .eq("is_active", true)
    .maybeSingle();
  if (team.error) throw team.error;
  if (!team.data)
    throw new TeamStudioRuntimeError(404, "활성 팀을 찾을 수 없습니다.");
  const memberRows = await db
    .from("team_members")
    .select("user_id, users(id, name)")
    .eq("team_id", teamId)
    .order("created_at")
    .order("user_id")
    .limit(201);
  if (memberRows.error) throw memberRows.error;
  if ((memberRows.data?.length ?? 0) > 200)
    throw new TeamStudioRuntimeError(
      422,
      "팀 멤버 수가 조회 한도를 초과합니다.",
    );
  const members = (memberRows.data ?? []).flatMap((row) =>
    row.users ? [{ userId: row.user_id, name: row.users.name }] : [],
  );
  const schedules = members.length
    ? await db
        .from("team_schedules")
        .select(
          "id, user_id, week_start_date, schedule_data, created_at, updated_at",
        )
        .in(
          "user_id",
          members.map((row) => row.userId),
        )
        .eq("week_start_date", weekStartDate)
    : { data: [], error: null };
  if (schedules.error) throw schedules.error;
  const byUser = new Map(
    (schedules.data ?? []).map((row) => [row.user_id, row]),
  );
  return {
    team: team.data,
    weekStartDate,
    members,
    schedules: members.map((member) => {
      const row = byUser.get(member.userId);
      const data = normalizeTeamTimeTableData(row?.schedule_data);
      return {
        user_id: member.userId,
        success: Boolean(row && data),
        schedule: row && data ? { ...row, schedule_data: data } : null,
      };
    }),
  };
}
