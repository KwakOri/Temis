import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import {
  getTemplateStudioLatestRevisionNo,
  getTemplateStudioTemplate,
  publishTemplateStudioDocument,
  validateTemplateStudioDocumentForPersistence,
} from "@/services/server/templateStudioPersistenceService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "요청 본문이 필요합니다." },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const prepared = validateTemplateStudioDocumentForPersistence(
      payload.document,
      payload.runtimeValues,
    );

    if (!prepared.ok) {
      return NextResponse.json(
        {
          error: prepared.message,
          diagnostics: prepared.diagnostics ?? [],
          migrationWarnings: prepared.migrationWarnings ?? [],
        },
        { status: 400 },
      );
    }

    const published = await publishTemplateStudioDocument({
      templateId,
      userId: actor.userId,
      document: prepared.document,
      runtimeValues: prepared.runtimeValues,
      deleteDraft: payload.deleteDraft !== false,
    });
    const latestRevisionNo = await getTemplateStudioLatestRevisionNo(templateId);

    return NextResponse.json({
      success: true,
      templateId,
      revisionNo: published.revisionNo,
      latestRevisionNo,
      document: published.document,
      diagnostics: prepared.diagnostics,
      migrationWarnings: prepared.migrationWarnings,
    });
  } catch (error) {
    console.error("Template Studio publish error:", error);
    return NextResponse.json(
      { error: "Template Studio 문서 발행 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
