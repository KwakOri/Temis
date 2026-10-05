import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { createTeamStudioConnectionService } from "@/services/server/teamStudioConnectionService";
import {
  getTemplateStudioTemplate,
  getTemplateStudioDraft,
  getTemplateStudioCurrentDocument,
} from "@/services/server/templateStudioPersistenceService";
import { TeamStudioRuntimeError } from "@/services/server/teamStudioDataService";
import { NextResponse } from "next/server";

export const service = createTeamStudioConnectionService({
  db: supabaseAdminServer,
  document: async (id, userId) => {
    const template = await getTemplateStudioTemplate(id);
    if (
      !template ||
      template.templateKind !== "timetable" ||
      template.status === "archived"
    )
      return null;
    const draft = await getTemplateStudioDraft(id, userId);
    return (
      draft?.document ??
      (await getTemplateStudioCurrentDocument(id))?.document ??
      null
    );
  },
});
export function errorResponse(error: unknown) {
  if (error instanceof TeamStudioRuntimeError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error("Team Studio connection request failed");
  return NextResponse.json(
    { error: "팀 연결 처리에 실패했습니다." },
    { status: 500 },
  );
}
