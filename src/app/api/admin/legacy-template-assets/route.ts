import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import { listLegacyAssetSets } from "@/services/server/legacyTemplateAssetService";
import { NextRequest } from "next/server";
import { legacyAssetErrorResponse, legacyAssetResponse } from "./_utils";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireTemplateStudioAdminActor(request);
    if (!actor.ok) return actor.response;
    return legacyAssetResponse({ sets: await listLegacyAssetSets() });
  } catch (error) {
    return legacyAssetErrorResponse(error);
  }
}
