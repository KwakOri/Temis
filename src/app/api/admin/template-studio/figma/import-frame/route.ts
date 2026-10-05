import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import { createFigmaFrameImportHandler } from "@/services/server/figmaFrameImportHandler";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return createFigmaFrameImportHandler({
    requireActor: requireTemplateStudioAdminActor,
  })(request);
}
