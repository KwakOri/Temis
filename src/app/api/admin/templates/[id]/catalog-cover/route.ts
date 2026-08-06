import { requireAdmin } from "@/lib/auth/middleware";
import {
  CATALOG_COVER_ALLOWED_TYPES,
  createCatalogCoverKey,
  getManagedCatalogCoverKey,
  validateCatalogCoverUpload,
} from "@/lib/catalog-cover";
import { deleteFileFromR2, getFileUrl, uploadFileToR2Key } from "@/lib/r2";
import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";

type CatalogCoverTemplate = {
  id: string;
  thumbnail_url: string | null;
  template_engine: string | null;
  template_kind: string | null;
};

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

const requirePublicUrl = () => {
  const publicUrl = (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  ).trim();

  if (!publicUrl) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL env is required.");
  }
};

const cleanupUploadedKey = async (fileKey: string | null) => {
  if (!fileKey) return;

  try {
    await deleteFileFromR2(fileKey);
  } catch (error) {
    console.error("Catalog cover orphan cleanup failed:", { fileKey, error });
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  let uploadedKey: string | null = null;

  try {
    const { id: templateId } = await params;
    const template = await getTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!isStudioCatalogTemplate(template)) {
      return NextResponse.json(
        {
          error:
            "Studio 시간표 또는 썸네일 템플릿만 대표 이미지를 등록할 수 있습니다.",
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "대표 이미지 파일이 필요합니다." },
        { status: 400 },
      );
    }

    const validation = validateCatalogCoverUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    requirePublicUrl();
    const mimeType = file.type as (typeof CATALOG_COVER_ALLOWED_TYPES)[number];
    uploadedKey = createCatalogCoverKey(templateId, mimeType);
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFileToR2Key(buffer, uploadedKey, mimeType);

    const newUrl = getFileUrl(uploadedKey);
    const { data: updatedTemplate, error: updateError } = await supabase
      .from("templates")
      .update({
        thumbnail_url: newUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .select("id, thumbnail_url")
      .single();

    if (updateError || !updatedTemplate) {
      throw updateError ?? new Error("대표 이미지 URL 저장에 실패했습니다.");
    }

    const previousKey = getManagedCatalogCoverKey(template.thumbnail_url);
    let cleanupWarning = false;
    if (previousKey && previousKey !== uploadedKey) {
      try {
        await deleteFileFromR2(previousKey);
      } catch (error) {
        cleanupWarning = true;
        console.error("Previous catalog cover cleanup failed:", {
          fileKey: previousKey,
          templateId,
          error,
        });
      }
    }

    uploadedKey = null;
    return NextResponse.json({
      template: updatedTemplate,
      cleanupWarning,
    });
  } catch (error) {
    await cleanupUploadedKey(uploadedKey);
    console.error("Catalog cover upload error:", error);
    return NextResponse.json(
      { error: "대표 이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id: templateId } = await params;
    const template = await getTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!isStudioCatalogTemplate(template)) {
      return NextResponse.json(
        {
          error:
            "Studio 시간표 또는 썸네일 템플릿만 대표 이미지를 관리할 수 있습니다.",
        },
        { status: 400 },
      );
    }

    const previousKey = getManagedCatalogCoverKey(template.thumbnail_url);
    const { data: updatedTemplate, error: updateError } = await supabase
      .from("templates")
      .update({
        thumbnail_url: "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .select("id, thumbnail_url")
      .single();

    if (updateError || !updatedTemplate) {
      throw updateError ?? new Error("대표 이미지 URL 삭제에 실패했습니다.");
    }

    let cleanupWarning = false;
    if (previousKey) {
      try {
        await deleteFileFromR2(previousKey);
      } catch (error) {
        cleanupWarning = true;
        console.error("Catalog cover delete cleanup failed:", {
          fileKey: previousKey,
          templateId,
          error,
        });
      }
    }

    return NextResponse.json({
      template: updatedTemplate,
      cleanupWarning,
    });
  } catch (error) {
    console.error("Catalog cover delete error:", error);
    return NextResponse.json(
      { error: "대표 이미지 삭제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
