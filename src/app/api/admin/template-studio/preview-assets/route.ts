import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import {
  deleteFilesFromR2,
  deleteFilesFromR2Prefix,
  uploadFileToR2,
} from "@/lib/r2";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);
const MAX_PREVIEW_ASSET_SIZE_BYTES = 10 * 1024 * 1024;

type PreviewAssetMapping = {
  clientId: string;
  source: string;
};

type PreviewAssetRow = {
  id: string;
  file_key: string;
};

type SupabaseErrorLike = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

type SupabaseResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

type PreviewAssetQueryBuilder<T> = PromiseLike<SupabaseResult<T>> & {
  delete(): PreviewAssetQueryBuilder<T>;
  eq(column: string, value: unknown): PreviewAssetQueryBuilder<T>;
  in(column: string, values: unknown[]): PreviewAssetQueryBuilder<T>;
  insert(value: unknown): PreviewAssetQueryBuilder<T>;
  lte(column: string, value: unknown): PreviewAssetQueryBuilder<T>;
  select(columns?: string): PreviewAssetQueryBuilder<T>;
};

type PreviewAssetSupabaseClient = {
  from<T = unknown>(table: string): PreviewAssetQueryBuilder<T>;
};

const previewAssetSupabase =
  supabaseAdminServer as unknown as PreviewAssetSupabaseClient;

const trimSlashes = (value: string): string =>
  value.replace(/^\/+|\/+$/g, "");

const sanitizePathSegment = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : fallback;
};

const resolvePreviewAssetBasePrefix = (): string => {
  const explicitPrefix = process.env.TEMPLATE_STUDIO_PREVIEW_R2_BASE_PREFIX;
  if (explicitPrefix && explicitPrefix.trim().length > 0) {
    return trimSlashes(explicitPrefix);
  }

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.APP_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  return isProduction
    ? "uploads/template-studio-preview"
    : "uploads/dev/template-studio-preview";
};

const buildPreviewAssetFolder = ({
  runId,
  previewId,
}: {
  runId: string;
  previewId: string;
}): string =>
  `${resolvePreviewAssetBasePrefix()}/${sanitizePathSegment(
    runId,
    "run",
  )}/${sanitizePathSegment(previewId, "preview")}`;

const parseMappings = (rawMappingJson: FormDataEntryValue | null) => {
  if (typeof rawMappingJson !== "string" || rawMappingJson.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawMappingJson) as unknown;
    if (!Array.isArray(parsed)) return null;

    const mappings = parsed
      .map((item): PreviewAssetMapping | null => {
        if (!item || typeof item !== "object") return null;

        const candidate = item as Record<string, unknown>;
        const clientId =
          typeof candidate.clientId === "string"
            ? candidate.clientId.trim()
            : "";
        const source =
          typeof candidate.source === "string" ? candidate.source.trim() : "";

        if (!clientId || !source) return null;
        return { clientId, source };
      })
      .filter((item): item is PreviewAssetMapping => Boolean(item));

    return mappings.length === parsed.length ? mappings : null;
  } catch {
    return null;
  }
};

const getPreviewAssetRows = async ({
  runId,
  previewId,
  expiredBefore,
}: {
  runId?: string | null;
  previewId?: string | null;
  expiredBefore?: string | null;
}): Promise<PreviewAssetRow[]> => {
  let query = previewAssetSupabase
    .from<PreviewAssetRow[]>("template_studio_preview_assets")
    .select("id, file_key");

  if (runId) {
    query = query.eq("run_id", runId);
  }

  if (previewId) {
    query = query.eq("preview_id", previewId);
  }

  if (expiredBefore) {
    query = query.lte("expires_at", expiredBefore);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as PreviewAssetRow[];
};

export async function POST(request: NextRequest) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  const uploadedFileKeys: string[] = [];
  let cleanupRunId: string | null = null;
  let cleanupPreviewId: string | null = null;

  try {
    const formData = await request.formData();
    const rawRunId = formData.get("runId");
    const rawPreviewId = formData.get("previewId");
    const runId =
      typeof rawRunId === "string" && rawRunId.trim().length > 0
        ? sanitizePathSegment(rawRunId, "run")
        : randomUUID();
    const previewId =
      typeof rawPreviewId === "string" && rawPreviewId.trim().length > 0
        ? sanitizePathSegment(rawPreviewId, "preview")
        : randomUUID();
    cleanupRunId = runId;
    cleanupPreviewId = previewId;
    const mappings = parseMappings(formData.get("mappingJson"));
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (!mappings || mappings.length === 0) {
      return NextResponse.json(
        { error: "업로드할 preview asset mapping이 필요합니다." },
        { status: 400 },
      );
    }

    if (files.length === 0 || files.length !== mappings.length) {
      return NextResponse.json(
        { error: "files와 mappingJson 항목 수가 일치해야 합니다." },
        { status: 400 },
      );
    }

    const folder = buildPreviewAssetFolder({ runId, previewId });
    const uploaded = [];

    for (const [index, file] of files.entries()) {
      const mapping = mappings[index];
      const mimeType = file.type || "application/octet-stream";
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `지원하지 않는 이미지 형식입니다: ${mimeType}` },
          { status: 400 },
        );
      }

      if (file.size > MAX_PREVIEW_ASSET_SIZE_BYTES) {
        return NextResponse.json(
          { error: `이미지 크기는 10MB 이하여야 합니다: ${file.name}` },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFileToR2(buffer, file.name, mimeType, folder);
      uploadedFileKeys.push(result.fileKey);
      const { error } = await previewAssetSupabase
        .from("template_studio_preview_assets")
        .insert({
          run_id: runId,
          preview_id: previewId,
          file_key: result.fileKey,
          url: result.url,
          source: mapping.source,
          mime_type: mimeType,
          byte_size: file.size,
          created_by: actor.userId,
        });

      if (error) {
        throw error;
      }

      uploaded.push({
        clientId: mapping.clientId,
        source: mapping.source,
        fileKey: result.fileKey,
        url: result.url,
        mimeType,
        byteSize: file.size,
      });
    }

    return NextResponse.json({
      success: true,
      runId,
      previewId,
      uploaded,
    });
  } catch (error) {
    await deleteFilesFromR2(uploadedFileKeys).catch(() => null);
    if (cleanupRunId && cleanupPreviewId) {
      try {
        await previewAssetSupabase
          .from("template_studio_preview_assets")
          .delete()
          .eq("run_id", cleanupRunId)
          .eq("preview_id", cleanupPreviewId);
      } catch {
        // Best effort rollback for temporary preview assets.
      }
    }

    console.error("Template Studio preview asset upload error:", error);
    return NextResponse.json(
      { error: "Template Studio preview asset 업로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const runIdParam = searchParams.get("runId");
    const previewIdParam = searchParams.get("previewId");
    const expiredOnly = searchParams.get("expired") === "true";
    const olderThanHoursParam = searchParams.get("olderThanHours");
    const runId = runIdParam
      ? sanitizePathSegment(runIdParam, "run")
      : null;
    const previewId = previewIdParam
      ? sanitizePathSegment(previewIdParam, "preview")
      : null;
    const olderThanHours = olderThanHoursParam
      ? Number(olderThanHoursParam)
      : null;

    if (
      !runId &&
      !previewId &&
      !expiredOnly &&
      (!Number.isFinite(olderThanHours) || !olderThanHours)
    ) {
      return NextResponse.json(
        {
          error:
            "삭제 기준(runId, previewId, expired=true, olderThanHours)이 필요합니다.",
        },
        { status: 400 },
      );
    }

    const expiredBefore =
      expiredOnly || olderThanHours
        ? new Date(
            Date.now() -
              (olderThanHours && Number.isFinite(olderThanHours)
                ? Math.max(0, olderThanHours) * 60 * 60 * 1000
                : 0),
          ).toISOString()
        : null;
    const rows = await getPreviewAssetRows({
      runId,
      previewId,
      expiredBefore,
    });
    let deletedR2ObjectCount = 0;

    if (runId) {
      const prefix = previewId
        ? buildPreviewAssetFolder({ runId, previewId })
        : `${resolvePreviewAssetBasePrefix()}/${runId}/`;
      deletedR2ObjectCount = await deleteFilesFromR2Prefix(prefix);
    } else {
      deletedR2ObjectCount = await deleteFilesFromR2(
        rows.map((row) => row.file_key),
      );
    }

    if (rows.length > 0) {
      const { error } = await previewAssetSupabase
        .from("template_studio_preview_assets")
        .delete()
        .in(
          "id",
          rows.map((row) => row.id),
        );

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      runId,
      previewId,
      deletedR2ObjectCount,
      deletedRegistryCount: rows.length,
    });
  } catch (error) {
    console.error("Template Studio preview asset cleanup error:", error);
    return NextResponse.json(
      { error: "Template Studio preview asset 삭제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
