import "server-only";

import { randomUUID } from "node:crypto";

import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import type { StudioDiagnostic } from "@/types/template-studio";
import {
  isTemplateStudioSaveOperation,
  sanitizeTemplateStudioDiagnostics,
  type TemplateStudioDocumentSummary,
  type TemplateStudioSaveOperation,
} from "@/utils/template-studio/save-audit";

export type TemplateStudioSaveStage =
  | "client_validation"
  | "asset_sync"
  | "server_validation"
  | "draft_persistence"
  | "publish_persistence";

export type TemplateStudioSaveStatus = "started" | "succeeded" | "failed";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface TemplateStudioSaveAuditQuery {
  insert(value: Record<string, unknown>): PromiseLike<{
    error: SupabaseErrorLike | null;
  }>;
}

interface TemplateStudioSaveAuditClient {
  from(table: "template_studio_save_events"): TemplateStudioSaveAuditQuery;
}

const auditClient =
  supabaseAdminServer as unknown as TemplateStudioSaveAuditClient;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const truncate = (value: unknown, maxLength: number): string | null =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;

export const resolveTemplateStudioSaveAttempt = (
  body: unknown,
  fallbackOperation: TemplateStudioSaveOperation,
): { attemptId: string; operation: TemplateStudioSaveOperation } => {
  const payload = isRecord(body) ? body : {};
  const attemptId =
    typeof payload.attemptId === "string" &&
    UUID_PATTERN.test(payload.attemptId)
      ? payload.attemptId
      : randomUUID();
  const operation = isTemplateStudioSaveOperation(payload.operation)
    ? payload.operation
    : fallbackOperation;

  return { attemptId, operation };
};

export const getTemplateStudioAuditError = (
  error: unknown,
): { errorCode: string | null; errorMessage: string } => {
  if (error instanceof Error) {
    const candidate = error as Error & { code?: unknown };
    return {
      errorCode: truncate(candidate.code, 100),
      errorMessage: error.message.slice(0, 1000),
    };
  }

  return {
    errorCode: null,
    errorMessage: String(error).slice(0, 1000),
  };
};

export const recordTemplateStudioSaveEvent = async (input: {
  attemptId: string;
  templateId: string;
  userId: number | null;
  operation: TemplateStudioSaveOperation;
  stage: TemplateStudioSaveStage;
  status: TemplateStudioSaveStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  diagnostics?: StudioDiagnostic[];
  documentSummary?: TemplateStudioDocumentSummary | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  const { error } = await auditClient
    .from("template_studio_save_events")
    .insert({
      attempt_id: input.attemptId,
      template_id: input.templateId,
      user_id: input.userId,
      operation: input.operation,
      stage: input.stage,
      status: input.status,
      error_code: truncate(input.errorCode, 100),
      error_message: truncate(input.errorMessage, 1000),
      diagnostics: sanitizeTemplateStudioDiagnostics(input.diagnostics),
      document_summary: input.documentSummary ?? {},
      metadata: input.metadata ?? {},
    });

  if (error) {
    throw new Error(
      `Failed to record Template Studio save event: ${error.message ?? error.code ?? "unknown error"}`,
    );
  }
};

/** Audit writes must never turn a successful editor save into a failure. */
export const recordTemplateStudioSaveEventSafe = async (
  input: Parameters<typeof recordTemplateStudioSaveEvent>[0],
): Promise<void> => {
  try {
    await recordTemplateStudioSaveEvent(input);
  } catch (error) {
    console.error("Template Studio save audit write failed:", error);
  }
};
