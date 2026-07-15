import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import {
  deleteTemplateStudioTemplate,
  getTemplateStudioCurrentDocument,
  getTemplateStudioDraft,
  getTemplateStudioLatestRevisionNo,
  getTemplateStudioTemplate,
  listTemplateStudioAssetMetadata,
} from "@/services/server/templateStudioPersistenceService";
import { deleteFilesFromR2Prefix } from "@/lib/r2";
import { buildTemplateStudioAssetTemplatePrefix } from "@/utils/template-studio/asset-storage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  try {
    const templateId = await parseTemplateStudioTemplateId({ params });
    if (!templateId) {
      return templateStudioBadTemplateIdResponse();
    }

    const template = await getTemplateStudioTemplate(templateId);
    if (!template) {
      return templateStudioTemplateNotFoundResponse();
    }

    const [document, draft, latestRevisionNo, assets] = await Promise.all([
      getTemplateStudioCurrentDocument(templateId),
      getTemplateStudioDraft(templateId, actor.userId),
      getTemplateStudioLatestRevisionNo(templateId),
      listTemplateStudioAssetMetadata(templateId),
    ]);

    return NextResponse.json({
      success: true,
      templateId,
      template,
      document,
      draft,
      assets,
      latestRevisionNo,
      source: draft ? "draft" : document ? "published" : "empty",
    });
  } catch (error) {
    console.error("Template Studio template fetch error:", error);
    return NextResponse.json(
      { error: "Template Studio 템플릿 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  try {
    const templateId = await parseTemplateStudioTemplateId({ params });
    if (!templateId) {
      return templateStudioBadTemplateIdResponse();
    }

    const template = await getTemplateStudioTemplate(templateId);
    if (!template) {
      return templateStudioTemplateNotFoundResponse();
    }

    // Best-effort: delete R2 objects before the DB row so a template can't
    // disappear from the admin list while its assets are still being
    // streamed to R2. A storage-provider failure here does not block the DB
    // delete — npm run cleanup:template-studio:r2-assets --template-id
    // remains the manual fallback for anything left behind.
    try {
      await deleteFilesFromR2Prefix(buildTemplateStudioAssetTemplatePrefix(templateId));
    } catch (r2Error) {
      console.error(
        `Template Studio R2 asset cleanup failed for template ${templateId}:`,
        r2Error
      );
    }

    await deleteTemplateStudioTemplate(templateId);

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    console.error("Template Studio template delete error:", error);
    return NextResponse.json(
      { error: "Template Studio 템플릿 삭제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
