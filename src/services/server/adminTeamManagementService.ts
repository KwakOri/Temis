import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { teamService } from "@/services/server/teamService";
import {
  getAdminTeamUsage,
  matchesAdminTeamScope,
  type AdminTeamScope,
} from "@/utils/admin-team-usage";

export async function listAdminTeams(scope: AdminTeamScope) {
  const [teams, legacy, studio] = await Promise.all([
    teamService.getAllTeams(supabaseAdminServer),
    supabaseAdminServer
      .from("relations_team_template_and_team")
      .select("team_id"),
    supabaseAdminServer.from("team_studio_connections").select("team_id"),
  ]);
  if (legacy.error) throw legacy.error;
  if (studio.error) throw studio.error;
  const legacyIds = new Set((legacy.data ?? []).map((row) => row.team_id));
  const studioIds = new Set((studio.data ?? []).map((row) => row.team_id));
  return teams
    .map((team) => ({
      ...team,
      editorUsage: getAdminTeamUsage(
        legacyIds.has(team.id),
        studioIds.has(team.id),
      ),
    }))
    .filter((team) => matchesAdminTeamScope(team.editorUsage, scope));
}
