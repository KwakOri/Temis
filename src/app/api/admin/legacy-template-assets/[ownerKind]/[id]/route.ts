import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import {
  applyLegacyAssetRevision,
  buildLegacyAssetRuntime,
  previewLegacyAssetChanges,
  requireLegacyAssetDetail,
} from "@/services/server/legacyTemplateAssetService";
import {
  presignLegacyAssetUpload,
  verifyLegacyAssetUpload,
} from "@/services/server/legacyTemplateAssetUploadService";
import {
  isRecord,
  LegacyAssetError,
  parseLegacyAssetUpload,
} from "@/utils/legacy-template-assets/contracts";
import { NextRequest } from "next/server";
import {
  assetOwnerFromParams,
  legacyAssetErrorResponse,
  legacyAssetResponse,
  readLegacyAssetRequest,
} from "../../_utils";

type Context = { params: Promise<{ ownerKind: string; id: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireTemplateStudioAdminActor(request);
    if (!actor.ok) return actor.response;
    return legacyAssetResponse(
      await requireLegacyAssetDetail(
        await assetOwnerFromParams(context.params),
      ),
    );
  } catch (error) {
    return legacyAssetErrorResponse(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireTemplateStudioAdminActor(request);
    if (!actor.ok) return actor.response;
    const owner = await assetOwnerFromParams(context.params);
    const detail = await requireLegacyAssetDetail(owner);
    if (Number(request.headers.get("content-length")) > 256 * 1024)
      throw new LegacyAssetError("요청이 너무 큽니다.", 413);
    const body = await readLegacyAssetRequest(request);
    if (!isRecord(body)) throw new LegacyAssetError("작업 정보가 필요합니다.");
    switch (body.action) {
      case "presign":
        return legacyAssetResponse(
          await presignLegacyAssetUpload(
            owner,
            detail,
            parseLegacyAssetUpload(body.upload),
            actor.userId,
          ),
        );
      case "verify": {
        if (typeof body.ticket !== "string")
          throw new LegacyAssetError("업로드 확인 정보가 필요합니다.");
        return legacyAssetResponse({
          version: await verifyLegacyAssetUpload(
            owner,
            detail,
            body.ticket,
            actor.userId,
          ),
        });
      }
      case "preview":
        return legacyAssetResponse(
          buildLegacyAssetRuntime(
            detail,
            previewLegacyAssetChanges(detail, body.changes),
          ),
        );
      case "apply":
        return legacyAssetResponse({
          revisionId: await applyLegacyAssetRevision(
            detail,
            body.expectedRevisionId,
            previewLegacyAssetChanges(detail, body.changes),
            actor.userId,
            typeof body.note === "string" ? body.note : "이미지 교체",
          ),
        });
      case "restore": {
        const revision = detail.revisions.find(
          (item) => item.id === body.revisionId,
        );
        if (!revision)
          throw new LegacyAssetError("복원할 이력이 없습니다.", 404);
        return legacyAssetResponse({
          revisionId: await applyLegacyAssetRevision(
            detail,
            body.expectedRevisionId,
            revision.bindings,
            actor.userId,
            `이력 #${revision.revision_no} 복원`,
          ),
        });
      }
      case "mode": {
        const revision = detail.revisions.find(
          (item) => item.id === detail.set.active_revision_id,
        );
        if (!revision || (body.mode !== "local" && body.mode !== "r2"))
          throw new LegacyAssetError("초기 이관과 적용 모드가 필요합니다.");
        return legacyAssetResponse({
          revisionId: await applyLegacyAssetRevision(
            detail,
            body.expectedRevisionId,
            revision.bindings,
            actor.userId,
            `모드: ${body.mode}`,
            body.mode,
          ),
        });
      }
      default:
        throw new LegacyAssetError("지원하지 않는 작업입니다.");
    }
  } catch (error) {
    return legacyAssetErrorResponse(error);
  }
}
