import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { JWTPayload } from "@/lib/auth/jwt";
import type {
  TeamStudioOptions,
  TeamStudioWeek,
} from "@/types/team-studio-runtime";
import type { StudioTemplateDocument } from "@/types/template-studio";
import { isTeamStudioMonday } from "@/utils/template-studio/team-runtime";
import { validateStudioDocument } from "@/utils/template-studio/validator";

import {
  TEAM_STUDIO_UUID as UUID,
  TeamStudioRuntimeError,
  readTeamStudioConnection,
  readTeamStudioTeamWeek,
  isMissingTeamStudioConnections,
} from "./teamStudioDataService";
export { TeamStudioRuntimeError } from "./teamStudioDataService";

type Actor = Pick<JWTPayload, "userId" | "role" | "email">;
type Dependencies = {
  db: SupabaseClient<Database>;
  entitlement: (
    id: string,
    actor: Actor,
  ) => Promise<{ hasAccess: boolean; isAdmin: boolean }>;
  template: (
    id: string,
  ) => Promise<{ name: string; status: string; templateKind: string } | null>;
  document: (id: string) => Promise<{
    document: StudioTemplateDocument;
    publishedRevisionNo: number | null;
  } | null>;
};
export function createTeamStudioRuntimeService(deps: Dependencies) {
  return {
    async options(actor: Actor): Promise<TeamStudioOptions> {
      const userId = Number(actor.userId);
      if (!Number.isSafeInteger(userId) || userId <= 0)
        throw new TeamStudioRuntimeError(400, "유효하지 않은 사용자입니다.");
      const admin = actor.role === "admin";
      let templateIds: string[] = [],
        teamIds: string[] = [];
      if (!admin) {
        const direct = await deps.db
          .from("template_access")
          .select("template_id")
          .eq("user_id", userId);
        const linked = await deps.db
          .from("template_artists")
          .select("template_id, artists!inner(user_id)")
          .eq("artists.user_id", userId);
        const membership = await deps.db
          .from("team_members")
          .select("team_id")
          .eq("user_id", userId);
        for (const result of [direct, linked, membership])
          if (result.error) throw result.error;
        templateIds = [
          ...new Set([
            ...(direct.data ?? []).map((row) => row.template_id),
            ...(linked.data ?? []).map((row) => row.template_id),
          ]),
        ];
        teamIds = [
          ...new Set((membership.data ?? []).map((row) => row.team_id)),
        ];
      }
      let templatesQuery = deps.db
        .from("templates")
        .select("id, name")
        .eq("template_engine", "studio")
        .eq("template_kind", "timetable")
        .eq("status", "published")
        .order("name")
        .order("id");
      let teamsQuery = deps.db
        .from("teams")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .order("id");
      if (!admin) {
        templatesQuery = templatesQuery.in("id", templateIds);
        teamsQuery = teamsQuery.in("id", teamIds);
      }
      const templates =
        !admin && templateIds.length === 0
          ? { data: [], error: null }
          : await templatesQuery;
      const teams =
        !admin && teamIds.length === 0
          ? { data: [], error: null }
          : await teamsQuery;
      if (templates.error) throw templates.error;
      if (teams.error) throw teams.error;
      if (!templates.data?.length)
        return { templates: [], teams: teams.data ?? [] };
      // Only project the team definition, never fetch every published graph for a list.
      const definitions = await deps.db
        .from("template_studio_documents")
        .select("template_id, team:document->domains->timetable->team")
        .in(
          "template_id",
          templates.data.map((row) => row.id),
        )
        .not("published_revision_no", "is", null);
      if (definitions.error) throw definitions.error;
      const counts = new Map(
        (definitions.data ?? []).flatMap((row) => {
          const team = row.team;
          return team &&
            typeof team === "object" &&
            !Array.isArray(team) &&
            Array.isArray(team.memberSlotIds) &&
            team.memberSlotIds.length > 0 &&
            team.memberSlotIds.length <= 12
            ? [[row.template_id, team.memberSlotIds.length] as const]
            : [];
        }),
      );
      const connections = await deps.db
        .from("team_studio_connections")
        .select("template_id, team_id")
        .in(
          "template_id",
          templates.data.map((row) => row.id),
        );
      if (
        connections.error &&
        !isMissingTeamStudioConnections(connections.error)
      )
        throw connections.error;
      const connectedTeams = new Map(
        (connections.data ?? []).map((row) => [row.template_id, row.team_id]),
      );
      const availableTeams = new Set((teams.data ?? []).map((row) => row.id));
      return {
        templates: templates.data.flatMap((row) =>
          counts.has(row.id) &&
          (!connectedTeams.has(row.id) ||
            availableTeams.has(connectedTeams.get(row.id)!))
            ? [
                {
                  id: row.id,
                  name: row.name,
                  memberSlotCount: counts.get(row.id)!,
                  ...(connectedTeams.has(row.id)
                    ? { connectedTeamId: connectedTeams.get(row.id)! }
                    : {}),
                },
              ]
            : [],
        ),
        teams: teams.data ?? [],
      };
    },

    async week(
      actor: Actor,
      templateId: string,
      teamId: string,
      weekStartDate: string,
    ): Promise<TeamStudioWeek> {
      if (
        !Number.isSafeInteger(Number(actor.userId)) ||
        Number(actor.userId) <= 0
      )
        throw new TeamStudioRuntimeError(400, "유효하지 않은 사용자입니다.");
      if (
        !UUID.test(templateId) ||
        (teamId !== "" && !UUID.test(teamId)) ||
        !isTeamStudioMonday(weekStartDate)
      )
        throw new TeamStudioRuntimeError(
          400,
          "템플릿·팀 ID와 월요일 날짜를 확인해 주세요.",
        );
      const access = await deps.entitlement(templateId, actor);
      if (!access.hasAccess)
        throw new TeamStudioRuntimeError(403, "접근 권한이 없습니다.");
      const connection = await readTeamStudioConnection(deps.db, templateId);
      if (connection) {
        if (teamId && teamId !== connection.teamId)
          throw new TeamStudioRuntimeError(
            403,
            "이 템플릿에 연결된 팀을 선택해 주세요.",
          );
        teamId = connection.teamId;
      }
      if (!UUID.test(teamId))
        throw new TeamStudioRuntimeError(400, "팀을 선택해 주세요.");
      if (!access.isAdmin) {
        const membership = await deps.db
          .from("team_members")
          .select("id")
          .eq("team_id", teamId)
          .eq("user_id", Number(actor.userId))
          .limit(1);
        if (membership.error) throw membership.error;
        if (!membership.data?.length)
          throw new TeamStudioRuntimeError(403, "접근 권한이 없습니다.");
      }
      const template = await deps.template(templateId);
      const published = await deps.document(templateId);
      if (
        !template ||
        template.status !== "published" ||
        template.templateKind !== "timetable" ||
        !published ||
        published.publishedRevisionNo === null ||
        !published.document.domains?.timetable?.team
      )
        throw new TeamStudioRuntimeError(
          404,
          "발행된 팀 템플릿을 찾을 수 없습니다.",
        );
      if (
        validateStudioDocument(published.document).some(
          (item) => item.severity === "error",
        )
      )
        throw new TeamStudioRuntimeError(
          422,
          "팀 템플릿 문서가 유효하지 않습니다.",
        );
      const week = await readTeamStudioTeamWeek(deps.db, teamId, weekStartDate);
      return {
        ...week,
        template: { id: templateId, name: template.name },
        document: published.document,
        revisionNo: published.publishedRevisionNo,
        connection,
      };
    },
  };
}
