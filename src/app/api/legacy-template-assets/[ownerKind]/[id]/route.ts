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
import { requiresLegacyAssetR2 } from "@/utils/legacy-template-assets/source-policy";
import { LegacyAssetError } from "@/utils/legacy-template-assets/contracts";
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
    if (!detail && requiresLegacyAssetR2(owner)) {
      throw new LegacyAssetError(
        "등록된 R2 에셋이 없습니다. 이미지 이관 상태를 확인해 주세요.",
        503,
      );
    }
    return legacyAssetResponse(
      detail
        ? buildLegacyAssetRuntime(detail)
        : { mode: "local", revisionId: null, images: {} },
    );
  } catch (error) {
    return legacyAssetErrorResponse(error);
  }
}
