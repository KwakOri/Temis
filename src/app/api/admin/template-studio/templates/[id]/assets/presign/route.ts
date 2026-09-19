import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import { createPresignedUploadUrlForKey, getFileUrl } from "@/lib/r2";
import { getTemplateStudioTemplate } from "@/services/server/templateStudioPersistenceService";
import {
  buildTemplateStudioAssetKey,
  getTemplateStudioAssetExtension,
} from "@/utils/template-studio/asset-storage";
import { NextRequest, NextResponse } from "next/server";

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

type PresignAssetPayload = {
  assetId: string;
  label: string;
  contentHash: string;
  mimeType: string;
  byteSize: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseAssets = (body: unknown): PresignAssetPayload[] | null => {
  if (!isRecord(body) || !Array.isArray(body.assets)) return null;

  const assets: PresignAssetPayload[] = [];
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
    const extension = getTemplateStudioAssetExtension(mimeType);

    if (
      !assetId.trim() ||
      !label.trim() ||
      !HASH_PATTERN.test(contentHash) ||
      !extension ||
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

  try {
    const templateId = await parseTemplateStudioTemplateId({ params });
    if (!templateId) {
      return templateStudioBadTemplateIdResponse();
    }

    const template = await getTemplateStudioTemplate(templateId);
    if (!template) {
      return templateStudioTemplateNotFoundResponse();
    }

    const assets = parseAssets(await request.json().catch(() => null));
    if (!assets) {
      return NextResponse.json(
        { error: "업로드할 Template Studio asset 메타데이터가 필요합니다." },
        { status: 400 },
      );
    }

    const uploads = await Promise.all(
      assets.map(async (asset) => {
        const extension = getTemplateStudioAssetExtension(asset.mimeType);
        if (!extension) {
          throw new Error(
            `Unsupported Template Studio asset MIME type: ${asset.mimeType}`,
          );
        }

        const storagePath = buildTemplateStudioAssetKey({
          templateId,
          assetId: asset.assetId,
          contentHash: asset.contentHash,
          extension,
        });
        const { uploadUrl } = await createPresignedUploadUrlForKey(
          storagePath,
          asset.mimeType,
        );

        return {
          ...asset,
          storagePath,
          publicUrl: getFileUrl(storagePath),
          uploadUrl,
          headers: {
            "Content-Type": asset.mimeType,
          },
        };
      }),
    );

    return NextResponse.json({
      success: true,
      templateId,
      assets: uploads,
    });
  } catch (error) {
    console.error("Template Studio asset presign error:", error);
    return NextResponse.json(
      {
        error:
          "Template Studio R2 asset 업로드 URL 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
