import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { AdminTeamList, TeamWithMembers } from "@/types/team-timetable";
import { isMissingTeamStudioConnections } from "./teamStudioDataService";
import {
  getAdminTeamUsage,
  matchesAdminTeamScope,
  type AdminTeamScope,
} from "@/utils/admin-team-usage";

export function createAdminTeamManagementService({
  db,
  getAllTeams,
}: {
  db: SupabaseClient<Database>;
  getAllTeams: () => Promise<TeamWithMembers[]>;
}) {
  return {
    async list(scope: AdminTeamScope): Promise<AdminTeamList> {
      const [teams, legacy, studio] = await Promise.all([
        getAllTeams(),
        db.from("relations_team_template_and_team").select("team_id"),
        db.from("team_studio_connections").select("team_id"),
      ]);
      if (legacy.error) throw legacy.error;
      const studioConnectionsAvailable = !isMissingTeamStudioConnections(
        studio.error,
      );
      if (studio.error && studioConnectionsAvailable) throw studio.error;
      const legacyIds = new Set((legacy.data ?? []).map((row) => row.team_id));
      const studioIds = new Set((studio.data ?? []).map((row) => row.team_id));
      return {
        studioConnectionsAvailable,
        teams: teams
          .map((team) => ({
            ...team,
            editorUsage: getAdminTeamUsage(
              legacyIds.has(team.id),
              studioIds.has(team.id),
            ),
          }))
          .filter((team) => matchesAdminTeamScope(team.editorUsage, scope)),
      };
    },
  };
}
