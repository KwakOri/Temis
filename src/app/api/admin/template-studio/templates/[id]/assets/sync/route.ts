import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import {
  getFileContentHashFromR2,
  getFileMetadataFromR2,
  getFileUrl,
} from "@/lib/r2";
import {
  getTemplateStudioTemplate,
  upsertTemplateStudioAssetMetadata,
} from "@/services/server/templateStudioPersistenceService";
import {
  getTemplateStudioAuditError,
  recordTemplateStudioSaveEventSafe,
  resolveTemplateStudioSaveAttempt,
} from "@/services/server/templateStudioSaveAuditService";
import {
  buildTemplateStudioAssetKey,
  getTemplateStudioAssetExtension,
} from "@/utils/template-studio/asset-storage";
import { NextRequest, NextResponse } from "next/server";

const STORAGE_PROVIDER = "r2";
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

type SyncAssetPayload = {
  assetId: string;
  label: string;
  contentHash: string;
  mimeType: string;
  byteSize: number;
};

class AssetSyncValidationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AssetSyncValidationError";
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getSyncAssets = (body: unknown): SyncAssetPayload[] | null => {
  if (!isRecord(body) || !Array.isArray(body.assets)) return null;

  const assets: SyncAssetPayload[] = [];
  for (const value of body.assets) {
    if (!isRecord(value)) return null;

    const assetId = typeof value.assetId === "string" ? value.assetId : "";
    const label = typeof value.label === "string" ? value.label : "";
    const contentHash =
      typeof value.contentHash === "string"
        ? value.contentHash.toLowerCase()
        : "";
    const mimeType = typeof value.mimeType === "string" ? value.mimeType : "";
    const byteSize =
      typeof value.byteSize === "number" && Number.isSafeInteger(value.byteSize)
        ? value.byteSize
        : 0;

    if (
      !assetId.trim() ||
      !label.trim() ||
      !HASH_PATTERN.test(contentHash) ||
      !getTemplateStudioAssetExtension(mimeType) ||
      byteSize <= 0
    ) {
      return null;
    }

    assets.push({
      assetId: assetId.trim(),
      label: label.trim(),
      contentHash,
      mimeType,
      byteSize,
    });
  }

  return assets;
};

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
  let auditMetadata: Record<string, unknown> = {};

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

    const body = await request.json().catch(() => null);
    auditAttempt = resolveTemplateStudioSaveAttempt(body, "save_draft");
    const assets = getSyncAssets(body);
    if (!assets) {
      await recordTemplateStudioSaveEventSafe({
        ...auditAttempt,
        templateId,
        userId: actor.userId,
        stage: "asset_sync",
        status: "failed",
        errorCode: "INVALID_ASSET_SYNC_PAYLOAD",
        errorMessage: "Asset sync metadata payload is invalid.",
      });
      return NextResponse.json(
        {
          error: "동기화할 Template Studio asset 메타데이터가 필요합니다.",
          attemptId: auditAttempt.attemptId,
        },
        { status: 400 },
      );
    }

    auditMetadata = {
      assetCount: assets.length,
      totalByteSize: assets.reduce((sum, asset) => sum + asset.byteSize, 0),
      uploadMode: "r2-direct",
    };
    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: "asset_sync",
      status: "started",
      metadata: auditMetadata,
    });

    const syncedAssets = [];
    for (const asset of assets) {
      const extension = getTemplateStudioAssetExtension(asset.mimeType);
      if (!extension) {
        throw new AssetSyncValidationError(
          `지원하지 않는 asset MIME 타입입니다: ${asset.label}`,
          "UNSUPPORTED_ASSET_MIME_TYPE",
        );
      }

      const storagePath = buildTemplateStudioAssetKey({
        templateId,
        assetId: asset.assetId,
        contentHash: asset.contentHash,
        extension,
      });

      let r2Metadata: Awaited<ReturnType<typeof getFileMetadataFromR2>>;
      try {
        r2Metadata = await getFileMetadataFromR2(storagePath);
      } catch {
        throw new AssetSyncValidationError(
          `R2에 업로드된 asset을 확인할 수 없습니다: ${asset.label}`,
          "R2_OBJECT_NOT_FOUND",
        );
      }

      if (r2Metadata.contentLength !== asset.byteSize) {
        throw new AssetSyncValidationError(
          `R2 asset 크기가 일치하지 않습니다: ${asset.label}`,
          "ASSET_SIZE_MISMATCH",
        );
      }

      const uploadedMimeType = r2Metadata.contentType.split(";", 1)[0]?.trim();
      if (uploadedMimeType !== asset.mimeType) {
        throw new AssetSyncValidationError(
          `R2 asset MIME 타입이 일치하지 않습니다: ${asset.label}`,
          "ASSET_MIME_MISMATCH",
        );
      }

      let actualContentHash: string;
      try {
        actualContentHash = await getFileContentHashFromR2(storagePath);
      } catch {
        throw new AssetSyncValidationError(
          `R2 asset 내용을 확인할 수 없습니다: ${asset.label}`,
          "R2_OBJECT_READ_FAILED",
        );
      }
      if (actualContentHash !== asset.contentHash) {
        throw new AssetSyncValidationError(
          `asset content hash가 일치하지 않습니다: ${asset.label}`,
          "ASSET_HASH_MISMATCH",
        );
      }

      const publicUrl = getFileUrl(storagePath);
      const syncedAt = new Date().toISOString();
      await upsertTemplateStudioAssetMetadata({
        templateId,
        assetId: asset.assetId,
        storageProvider: STORAGE_PROVIDER,
        storagePath,
        publicUrl,
        contentHash: actualContentHash,
        mimeType: uploadedMimeType,
        byteSize: r2Metadata.contentLength,
        createdBy: actor.userId,
        lastSyncedAt: syncedAt,
      });

      syncedAssets.push({
        id: asset.assetId,
        label: asset.label,
        src: publicUrl,
        storageProvider: STORAGE_PROVIDER,
        storagePath,
        publicUrl,
        contentHash: actualContentHash,
        mimeType: uploadedMimeType,
        byteSize: r2Metadata.contentLength,
        uploaded: true,
        lastSyncedAt: syncedAt,
      });
    }

    await recordTemplateStudioSaveEventSafe({
      ...auditAttempt,
      templateId,
      userId: actor.userId,
      stage: "asset_sync",
      status: "succeeded",
      metadata: {
        ...auditMetadata,
        syncedCount: syncedAssets.length,
      },
    });

    return NextResponse.json({
      success: true,
      templateId,
      attemptId: auditAttempt.attemptId,
      assets: syncedAssets,
    });
  } catch (error) {
    console.error("Template Studio asset metadata sync error:", error);
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
        stage: "asset_sync",
        status: "failed",
        ...auditError,
        metadata: auditMetadata,
      });
    }

    const isValidationError = error instanceof AssetSyncValidationError;
    return NextResponse.json(
      {
        error: isValidationError
          ? error.message
          : "Template Studio asset 메타데이터 동기화 중 오류가 발생했습니다.",
        attemptId: failedAttempt?.attemptId ?? null,
      },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
