import { createFigmaGridAnalyzeHandler } from "@/services/server/figmaGridAnalyzeHandler";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { requireTemplateStudioAdminActor } =
    await import("@/app/api/admin/template-studio/_utils");
  return createFigmaGridAnalyzeHandler({
    requireActor: requireTemplateStudioAdminActor,
  })(request);
}
