import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import {
  getTemplateStudioDraft,
  getTemplateStudioTemplate,
  saveTemplateStudioDraft,
  validateTemplateStudioDocumentForPersistence,
} from "@/services/server/templateStudioPersistenceService";
import { NextRequest, NextResponse } from "next/server";

const getPositiveIntegerOrNull = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
};

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

    const draft = await getTemplateStudioDraft(templateId, actor.userId);

    return NextResponse.json({
      success: true,
      templateId,
      hasDraft: Boolean(draft),
      draft,
    });
  } catch (error) {
    console.error("Template Studio draft fetch error:", error);
    return NextResponse.json(
      { error: "Template Studio draft 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function PUT(
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

    const draft = await saveTemplateStudioDraft({
      templateId,
      userId: actor.userId,
      document: prepared.document,
      runtimeValues: prepared.runtimeValues,
      baseRevisionNo: getPositiveIntegerOrNull(payload.baseRevisionNo),
      isAutosave: payload.isAutosave !== false,
    });

    return NextResponse.json({
      success: true,
      templateId,
      hasDraft: true,
      draft,
      diagnostics: prepared.diagnostics,
      migrationWarnings: prepared.migrationWarnings,
    });
  } catch (error) {
    console.error("Template Studio draft save error:", error);
    return NextResponse.json(
      { error: "Template Studio draft 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
