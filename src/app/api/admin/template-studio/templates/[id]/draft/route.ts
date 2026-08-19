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
import {
  getTemplateStudioAuditError,
  recordTemplateStudioSaveEventSafe,
  resolveTemplateStudioSaveAttempt,
  type TemplateStudioSaveStage,
} from "@/services/server/templateStudioSaveAuditService";
import { createTemplateStudioDocumentSummary } from "@/utils/template-studio/save-audit";
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

  let auditAttempt: ReturnType<typeof resolveTemplateStudioSaveAttempt> | null =
    null;
  let auditTemplateId: string | null = null;
  let auditStage: TemplateStudioSaveStage = "server_validation";

  try {
    const templateId = await parseTemplateStudioTemplateId({ params });
    if (!templateId) {
      return templateStudioBadTemplateIdResponse();
    }
    auditTemplateId = templateId;

    const template = await getTemplateStudioTemplate(templateId);
    if (!template) {
      return templateStudioTemplateNotFoundResponse();
    }

    const body = await request.json();
    auditAttempt = resolveTemplateStudioSaveAttempt(body, "save_draft");
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      await recordTemplateStudioSaveEventSafe({
        ...auditAttempt,
        templateId,
        userId: actor.userId,
        stage: "server_validation",
        status: "failed",
        errorCode: "INVALID_REQUEST_BODY",
        errorMessage: "Draft save request body is invalid.",
      });
      return NextResponse.json(
        {
          error: "요청 본문이 필요합니다.",
          attemptId: auditAttempt.attemptId,
        },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: "server_validation",
      status: "started",
    });
    const prepared = validateTemplateStudioDocumentForPersistence(
      payload.document,
      payload.runtimeValues,
      { expectedTemplateKind: template.templateKind },
    );

    if (!prepared.ok) {
      await recordTemplateStudioSaveEventSafe({
        ...auditAttempt,
        templateId,
        userId: actor.userId,
        stage: "server_validation",
        status: "failed",
        errorCode: "DOCUMENT_VALIDATION_FAILED",
        errorMessage: prepared.message,
        diagnostics: prepared.diagnostics ?? [],
      });
      return NextResponse.json(
        {
          error: prepared.message,
          attemptId: auditAttempt.attemptId,
          diagnostics: prepared.diagnostics ?? [],
          migrationWarnings: prepared.migrationWarnings ?? [],
        },
        { status: 400 },
      );
    }

    const documentSummary = createTemplateStudioDocumentSummary(
      prepared.document,
      prepared.runtimeValues,
    );
    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: "server_validation",
      status: "succeeded",
      documentSummary,
    });
    auditStage = "draft_persistence";
    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: auditStage,
      status: "started",
      documentSummary,
    });

    const draft = await saveTemplateStudioDraft({
      templateId,
      userId: actor.userId,
      document: prepared.document,
      runtimeValues: prepared.runtimeValues,
      templateKind: template.templateKind,
      baseRevisionNo: getPositiveIntegerOrNull(payload.baseRevisionNo),
      isAutosave: payload.isAutosave !== false,
    });
    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: auditStage,
      status: "succeeded",
      documentSummary,
      metadata: { draftId: draft.id },
    });

    return NextResponse.json({
      success: true,
      templateId,
      attemptId: auditAttempt.attemptId,
      hasDraft: true,
      draft,
      diagnostics: prepared.diagnostics,
      migrationWarnings: prepared.migrationWarnings,
    });
  } catch (error) {
    console.error("Template Studio draft save error:", error);
    const failedAttempt =
      auditAttempt ??
      (auditTemplateId
        ? resolveTemplateStudioSaveAttempt(null, "save_draft")
        : null);
    if (failedAttempt && auditTemplateId) {
      const auditError = getTemplateStudioAuditError(error);
      await recordTemplateStudioSaveEventSafe({
        ...failedAttempt,
        templateId: auditTemplateId,
        userId: actor.userId,
        stage: auditStage,
        status: "failed",
        ...auditError,
      });
    }
    return NextResponse.json(
      {
        error: "Template Studio draft 저장 중 오류가 발생했습니다.",
        attemptId: failedAttempt?.attemptId ?? null,
      },
      { status: 500 },
    );
  }
}
