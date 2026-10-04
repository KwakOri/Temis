import { optionalAuth } from "@/lib/auth/middleware";
import {
  assetOwnerFromParams,
  legacyAssetErrorResponse,
  legacyAssetResponse,
} from "@/app/api/admin/legacy-template-assets/_utils";
import { requireLegacyAssetRuntimeAccess } from "@/services/server/legacyTemplateAssetAccessService";
import {
  buildLegacyAssetRuntime,
  getLegacyAssetDetail,
} from "@/services/server/legacyTemplateAssetService";
import { NextRequest } from "next/server";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ownerKind: string; id: string }> },
) {
  try {
    const owner = await assetOwnerFromParams(
      params,
      request.nextUrl.searchParams.get("purpose") ?? undefined,
    );
    const { user } = await optionalAuth(request);
    await requireLegacyAssetRuntimeAccess(owner, user);
    const detail = await getLegacyAssetDetail(owner);
    return legacyAssetResponse(
      detail
        ? buildLegacyAssetRuntime(detail)
        : { mode: "local", revisionId: null, images: {} },
    );
  } catch (error) {
    return legacyAssetErrorResponse(error);
  }
}
