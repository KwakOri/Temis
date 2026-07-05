import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import {
  getTemplateStudioTemplate,
  upsertTemplateStudioAssetMetadata,
} from "@/services/server/templateStudioPersistenceService";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const TEMPLATE_STUDIO_ASSET_BUCKET = "template-studio-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

type UploadAssetPayload = {
  assetId: string;
  label: string;
  src: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseDataUrl = (src: string) => {
  const match = src.match(/^data:([^;,]+)((?:;[^,]+)*),([\s\S]*)$/);
  if (!match) return null;

  const mimeType = match[1];
  const extension = MIME_EXTENSION[mimeType];
  if (!extension) return null;

  const parameters = match[2]
    .split(";")
    .map((parameter) => parameter.trim().toLowerCase())
    .filter(Boolean);
  const data = match[3];
  let buffer: Buffer;
  try {
    buffer = parameters.includes("base64")
      ? Buffer.from(data, "base64")
      : Buffer.from(decodeURIComponent(data), "utf8");
  } catch {
    return null;
  }

  if (buffer.byteLength === 0) return null;

  return {
    mimeType,
    extension,
    buffer,
  };
};

const getUploadAssets = (body: unknown): UploadAssetPayload[] | null => {
  if (!isRecord(body) || !Array.isArray(body.assets)) return null;

  const assets: UploadAssetPayload[] = [];

  for (const asset of body.assets) {
    if (!isRecord(asset)) return null;

    const assetId = typeof asset.assetId === "string" ? asset.assetId : "";
    const label = typeof asset.label === "string" ? asset.label : "";
    const src = typeof asset.src === "string" ? asset.src : "";

    if (!assetId || !label || !src) return null;
    assets.push({ assetId, label, src });
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

    const assets = getUploadAssets(await request.json());
    if (!assets) {
      return NextResponse.json(
        { error: "업로드할 Template Studio asset 목록이 필요합니다." },
        { status: 400 },
      );
    }

    const uploadedAssets = [];

    for (const asset of assets) {
      const parsed = parseDataUrl(asset.src);
      if (!parsed) {
        return NextResponse.json(
          { error: `지원하지 않는 asset data URL입니다: ${asset.label}` },
          { status: 400 },
        );
      }

      const storagePath = `template-studio/${templateId}/assets/${asset.assetId}/${randomUUID()}.${parsed.extension}`;
      const { error: uploadError } = await supabaseAdminServer.storage
        .from(TEMPLATE_STUDIO_ASSET_BUCKET)
        .upload(storagePath, parsed.buffer, {
          contentType: parsed.mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } =
        await supabaseAdminServer.storage
          .from(TEMPLATE_STUDIO_ASSET_BUCKET)
          .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

      if (signedUrlError) {
        throw signedUrlError;
      }

      const metadata = await upsertTemplateStudioAssetMetadata({
        templateId,
        assetId: asset.assetId,
        storagePath,
        mimeType: parsed.mimeType,
        byteSize: parsed.buffer.byteLength,
        createdBy: actor.userId,
      });

      uploadedAssets.push({
        id: asset.assetId,
        label: asset.label,
        src: signedUrlData.signedUrl,
        storagePath,
        mimeType: parsed.mimeType,
        byteSize: parsed.buffer.byteLength,
        metadata,
      });
    }

    return NextResponse.json({
      success: true,
      templateId,
      assets: uploadedAssets,
    });
  } catch (error) {
    console.error("Template Studio asset upload error:", error);
    return NextResponse.json(
      { error: "Template Studio asset 업로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
