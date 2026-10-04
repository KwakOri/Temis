import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { TemplateService } from "@/lib/templates";
import {
  getTemplateStudioCurrentDocument,
  getTemplateStudioTemplate,
} from "@/services/server/templateStudioPersistenceService";
import {
  createTeamStudioRuntimeService,
  TeamStudioRuntimeError,
} from "@/services/server/teamStudioRuntimeService";
import { NextResponse } from "next/server";

export const teamStudioRuntimeService = createTeamStudioRuntimeService({
  db: supabaseAdminServer,
  entitlement: TemplateService.resolveEntitlement,
  template: getTemplateStudioTemplate,
  document: getTemplateStudioCurrentDocument,
});
export function teamStudioErrorResponse(error: unknown) {
  if (error instanceof TeamStudioRuntimeError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error("Team Studio runtime request failed");
  return NextResponse.json(
    { error: "팀 시간표를 불러오지 못했습니다." },
    { status: 500 },
  );
}
