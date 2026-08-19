import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import { getTemplateStudioTemplate } from "@/services/server/templateStudioPersistenceService";
import {
  recordTemplateStudioSaveEventSafe,
  resolveTemplateStudioSaveAttempt,
} from "@/services/server/templateStudioSaveAuditService";
import {
  sanitizeTemplateStudioDocumentSummary,
  sanitizeTemplateStudioDiagnostics,
} from "@/utils/template-studio/save-audit";
import { NextRequest, NextResponse } from "next/server";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) return actor.response;

  const templateId = await parseTemplateStudioTemplateId({ params });
  if (!templateId) return templateStudioBadTemplateIdResponse();

  const template = await getTemplateStudioTemplate(templateId);
  if (!template) return templateStudioTemplateNotFoundResponse();

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "요청 본문이 필요합니다." },
      { status: 400 },
    );
  }

  const attempt = resolveTemplateStudioSaveAttempt(body, "save_draft");
  const documentSummary = sanitizeTemplateStudioDocumentSummary(
    body.documentSummary,
  );
  const errorMessage =
    typeof body.errorMessage === "string"
      ? body.errorMessage.slice(0, 1000)
      : "Client validation failed.";

  await recordTemplateStudioSaveEventSafe({
    ...attempt,
    templateId,
    userId: actor.userId,
    stage: "client_validation",
    status: "failed",
    errorCode: "CLIENT_VALIDATION_FAILED",
    errorMessage,
    diagnostics: sanitizeTemplateStudioDiagnostics(body.diagnostics),
    documentSummary,
  });

  return NextResponse.json({
    success: true,
    templateId,
    attemptId: attempt.attemptId,
  });
}
