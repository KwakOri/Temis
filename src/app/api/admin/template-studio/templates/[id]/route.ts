import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import {
  getTemplateStudioCurrentDocument,
  getTemplateStudioDraft,
  getTemplateStudioLatestRevisionNo,
  getTemplateStudioTemplate,
  listTemplateStudioAssetMetadata,
} from "@/services/server/templateStudioPersistenceService";
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
