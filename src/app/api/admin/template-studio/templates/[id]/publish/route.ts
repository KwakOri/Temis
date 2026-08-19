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
import {
  getTemplateStudioAuditError,
  recordTemplateStudioSaveEventSafe,
  resolveTemplateStudioSaveAttempt,
  type TemplateStudioSaveStage,
} from "@/services/server/templateStudioSaveAuditService";
import { createTemplateStudioDocumentSummary } from "@/utils/template-studio/save-audit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
    auditAttempt = resolveTemplateStudioSaveAttempt(body, "publish");
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      await recordTemplateStudioSaveEventSafe({
        ...auditAttempt,
        templateId,
        userId: actor.userId,
        stage: "server_validation",
        status: "failed",
        errorCode: "INVALID_REQUEST_BODY",
        errorMessage: "Publish request body is invalid.",
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
    auditStage = "publish_persistence";
    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: auditStage,
      status: "started",
      documentSummary,
    });

    const published = await publishTemplateStudioDocument({
      templateId,
      userId: actor.userId,
      document: prepared.document,
      runtimeValues: prepared.runtimeValues,
      templateKind: template.templateKind,
      deleteDraft: payload.deleteDraft !== false,
    });
    const latestRevisionNo =
      await getTemplateStudioLatestRevisionNo(templateId);
    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: auditStage,
      status: "succeeded",
      documentSummary,
      metadata: { revisionNo: published.revisionNo },
    });

    return NextResponse.json({
      success: true,
      templateId,
      attemptId: auditAttempt.attemptId,
      revisionNo: published.revisionNo,
      latestRevisionNo,
      document: published.document,
      diagnostics: prepared.diagnostics,
      migrationWarnings: prepared.migrationWarnings,
    });
  } catch (error) {
    console.error("Template Studio publish error:", error);
    const failedAttempt =
      auditAttempt ??
      (auditTemplateId
        ? resolveTemplateStudioSaveAttempt(null, "publish")
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
        error: "Template Studio 문서 발행 중 오류가 발생했습니다.",
        attemptId: failedAttempt?.attemptId ?? null,
      },
      { status: 500 },
    );
  }
}
