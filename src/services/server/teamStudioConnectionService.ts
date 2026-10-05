import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";
import type { StudioTemplateDocument } from "@/types/template-studio";
import {
  TEAM_STUDIO_UUID,
  TeamStudioRuntimeError,
  assertTeamStudioStorage,
  readTeamStudioConnection,
  readTeamStudioTeamWeek,
} from "./teamStudioDataService";

type Dependencies = {
  db: SupabaseClient<Database>;
  document: (
    templateId: string,
    userId: number,
  ) => Promise<StudioTemplateDocument | null>;
};

export function createTeamStudioConnectionService({
  db,
  document,
}: Dependencies) {
  async function requireDocument(templateId: string, userId: number) {
    if (!TEAM_STUDIO_UUID.test(templateId))
      throw new TeamStudioRuntimeError(400, "템플릿 ID를 확인해 주세요.");
    const doc = await document(templateId, userId);
    if (!doc?.domains?.timetable?.team)
      throw new TeamStudioRuntimeError(
        404,
        "저장된 팀 Studio 템플릿을 찾을 수 없습니다.",
      );
    return doc;
  }
  return {
    async get(templateId: string, userId: number) {
      await requireDocument(templateId, userId);
      return readTeamStudioConnection(db, templateId, true);
    },
    async save(templateId: string, userId: number, body: unknown) {
      const doc = await requireDocument(templateId, userId);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new TeamStudioRuntimeError(400, "팀 연결 정보를 확인해 주세요.");
      const { teamId, memberBindings } = body as Record<string, unknown>;
      if (
        typeof teamId !== "string" ||
        !TEAM_STUDIO_UUID.test(teamId) ||
        !memberBindings ||
        typeof memberBindings !== "object" ||
        Array.isArray(memberBindings)
      )
        throw new TeamStudioRuntimeError(
          400,
          "팀과 멤버 배치를 확인해 주세요.",
        );
      const team = await db
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .eq("is_active", true)
        .maybeSingle();
      if (team.error) throw team.error;
      if (!team.data)
        throw new TeamStudioRuntimeError(404, "활성 팀을 찾을 수 없습니다.");
      const members = await db
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);
      if (members.error) throw members.error;
      const userIds = new Set((members.data ?? []).map((row) => row.user_id));
      const slots = new Set(doc.domains!.timetable!.team!.memberSlotIds);
      const bindings = Object.entries(memberBindings);
      const assigned = new Set<number>();
      for (const [slot, id] of bindings) {
        if (
          !slots.has(slot) ||
          typeof id !== "number" ||
          !Number.isSafeInteger(id) ||
          !userIds.has(id) ||
          assigned.has(id)
        )
          throw new TeamStudioRuntimeError(
            400,
            "멤버 배치는 현재 템플릿 슬롯과 팀 멤버를 기준으로 중복 없이 지정해 주세요.",
          );
        assigned.add(id);
      }
      const result = await db.from("team_studio_connections").upsert(
        {
          template_id: templateId,
          team_id: teamId,
          member_bindings: memberBindings as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "template_id" },
      );
      assertTeamStudioStorage(result.error);
      return readTeamStudioConnection(db, templateId, true);
    },
    async disconnect(templateId: string, userId: number) {
      await requireDocument(templateId, userId);
      const result = await db
        .from("team_studio_connections")
        .delete()
        .eq("template_id", templateId);
      assertTeamStudioStorage(result.error);
    },
    async preview(
      templateId: string,
      userId: number,
      teamId: string,
      week: string,
    ) {
      await requireDocument(templateId, userId);
      return readTeamStudioTeamWeek(db, teamId, week);
    },
  };
}
