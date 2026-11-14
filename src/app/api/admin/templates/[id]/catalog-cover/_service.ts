import { signJWT, type JWTPayload } from "@/lib/auth/jwt";
import {
  isCatalogCoverKeyForTemplate,
  type CatalogCoverUploadMetadata,
} from "@/lib/catalog-cover";
import { deleteFileFromR2, getFileMetadataFromR2 } from "@/lib/r2";
import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
import { NextResponse } from "next/server";

type CatalogCoverTemplate = {
  id: string;
  thumbnail_url: string | null;
  template_engine: string | null;
  template_kind: string | null;
};

export interface CatalogCoverUpload extends CatalogCoverUploadMetadata {
  fileKey: string;
}

const CATALOG_COVER_UPLOAD_TOKEN_PURPOSE = "catalog-cover-r2-upload";
const CATALOG_COVER_UPLOAD_TOKEN_EXPIRES_IN = "10m";

const getTemplate = async (templateId: string) => {
  const { data, error } = await supabase
    .from("templates")
    .select("id, thumbnail_url, template_engine, template_kind")
    .eq("id", templateId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CatalogCoverTemplate;
};

const isStudioCatalogTemplate = (template: CatalogCoverTemplate) =>
  template.template_engine === "studio" &&
  (template.template_kind === "timetable" ||
    template.template_kind === "thumbnail");

/**
 * 대표 이미지를 다룰 수 있는 Studio 템플릿을 조회한다.
 * 없거나 대상이 아니면 그대로 반환할 오류 응답을 돌려준다.
 */
export const getStudioCatalogTemplate = async (
  templateId: string,
  unsupportedMessage: string,
): Promise<CatalogCoverTemplate | NextResponse> => {
  const template = await getTemplate(templateId);

  if (!template) {
    return NextResponse.json(
      { error: "템플릿을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (!isStudioCatalogTemplate(template)) {
    return NextResponse.json({ error: unsupportedMessage }, { status: 400 });
  }

  return template;
};

export const requirePublicUrl = () => {
  const publicUrl = (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  ).trim();

  if (!publicUrl) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL env is required.");
  }
};

export const cleanupUploadedKey = async (fileKey: string | null) => {
  if (!fileKey) return;

  try {
    await deleteFileFromR2(fileKey);
  } catch (error) {
    console.error("Catalog cover orphan cleanup failed:", { fileKey, error });
  }
};

export const signCatalogCoverUploadToken = ({
  userId,
  templateId,
  upload,
}: {
  userId: string | number;
  templateId: string;
  upload: CatalogCoverUpload;
}) =>
  signJWT(
    {
      purpose: CATALOG_COVER_UPLOAD_TOKEN_PURPOSE,
      userId,
      templateId,
      fileKey: upload.fileKey,
      originalName: upload.name,
      fileSize: upload.size,
      mimeType: upload.type,
    },
    CATALOG_COVER_UPLOAD_TOKEN_EXPIRES_IN,
  );

/**
 * presign 단계에서 발급한 토큰이 같은 관리자와 같은 템플릿의 업로드인지 확인한다.
 */
export const readCatalogCoverUploadToken = (
  payload: JWTPayload,
  userId: string | number,
  templateId: string,
): CatalogCoverUpload | null => {
  if (
    payload.purpose !== CATALOG_COVER_UPLOAD_TOKEN_PURPOSE ||
    Number(payload.userId) !== Number(userId) ||
    payload.templateId !== templateId ||
    typeof payload.fileKey !== "string" ||
    !isCatalogCoverKeyForTemplate(payload.fileKey, templateId) ||
    typeof payload.originalName !== "string" ||
    typeof payload.mimeType !== "string" ||
    typeof payload.fileSize !== "number"
  ) {
    return null;
  }

  return {
    fileKey: payload.fileKey,
    name: payload.originalName,
    size: payload.fileSize,
    type: payload.mimeType,
  };
};

/**
 * 브라우저가 R2에 올린 객체가 presign 요청 정보와 같은지 확인한다.
 * 일치하지 않으면 사용자에게 보여줄 오류 메시지를 반환한다.
 */
export const verifyUploadedCatalogCover = async (
  upload: CatalogCoverUpload,
): Promise<string | null> => {
  const metadata = await getFileMetadataFromR2(upload.fileKey);

  if (metadata.contentLength !== upload.size) {
    return "업로드된 대표 이미지 크기가 요청 정보와 일치하지 않습니다.";
  }

  const uploadedType = metadata.contentType.split(";")[0];
  if (uploadedType && uploadedType !== upload.type) {
    return "업로드된 대표 이미지 형식이 요청 정보와 일치하지 않습니다.";
  }

  return null;
};
