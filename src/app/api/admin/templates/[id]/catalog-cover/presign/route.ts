import { requireAdmin } from "@/lib/auth/middleware";
import {
  createCatalogCoverKey,
  validateCatalogCoverUpload,
  type CatalogCoverMimeType,
  type CatalogCoverUploadMetadata,
} from "@/lib/catalog-cover";
import { createPresignedUploadUrlForKey } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";
import {
  getStudioCatalogTemplate,
  requirePublicUrl,
  signCatalogCoverUploadToken,
} from "../_service";

const parseUploadMetadata = (
  body: unknown,
): CatalogCoverUploadMetadata | null => {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { name, size, type } = body as Partial<CatalogCoverUploadMetadata>;
  return {
    name: String(name || ""),
    size: Number(size || 0),
    type: String(type || ""),
  };
};

/**
 * 대표 이미지는 Vercel 함수의 요청 본문 한도(4.5MB)를 넘을 수 있으므로
 * 브라우저가 R2에 직접 올릴 presigned URL과 완료 토큰을 발급한다.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id: templateId } = await params;
    const template = await getStudioCatalogTemplate(
      templateId,
      "Studio 시간표 또는 썸네일 템플릿만 대표 이미지를 등록할 수 있습니다.",
    );

    if (template instanceof NextResponse) {
      return template;
    }

    const metadata = parseUploadMetadata(
      await request.json().catch(() => null),
    );

    if (!metadata) {
      return NextResponse.json(
        { error: "업로드할 대표 이미지 정보가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const validation = validateCatalogCoverUpload(metadata);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    requirePublicUrl();
    const mimeType = metadata.type as CatalogCoverMimeType;
    const fileKey = createCatalogCoverKey(templateId, mimeType);
    const { uploadUrl } = await createPresignedUploadUrlForKey(
      fileKey,
      mimeType,
    );
    const token = await signCatalogCoverUploadToken({
      userId: adminCheck.user.userId,
      templateId,
      upload: { ...metadata, fileKey },
    });

    return NextResponse.json({
      uploadUrl,
      token,
      headers: {
        "Content-Type": mimeType,
      },
    });
  } catch (error) {
    console.error("Catalog cover presign error:", error);
    return NextResponse.json(
      { error: "대표 이미지 업로드 URL 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
