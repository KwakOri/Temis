import { verifyJWT } from "@/lib/auth/jwt";
import { requireAdmin } from "@/lib/auth/middleware";
import {
  getManagedCatalogCoverKey,
  validateCatalogCoverUpload,
} from "@/lib/catalog-cover";
import { deleteFileFromR2, getFileUrl } from "@/lib/r2";
import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";
import {
  cleanupUploadedKey,
  getStudioCatalogTemplate,
  readCatalogCoverUploadToken,
  requirePublicUrl,
  verifyUploadedCatalogCover,
} from "./_service";

/**
 * presign 단계에서 브라우저가 R2에 직접 올린 대표 이미지를 템플릿에 연결한다.
 * 연결하지 못하면 올라간 객체를 정리한다.
 */
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
    const body = (await request.json().catch(() => null)) as {
      token?: unknown;
    } | null;
    const payload =
      typeof body?.token === "string" ? await verifyJWT(body.token) : null;
    const upload = payload
      ? readCatalogCoverUploadToken(
          payload,
          adminCheck.user.userId,
          templateId,
        )
      : null;

    if (!upload) {
      return NextResponse.json(
        { error: "유효하지 않은 대표 이미지 업로드 정보입니다." },
        { status: 400 },
      );
    }

    uploadedKey = upload.fileKey;

    const template = await getStudioCatalogTemplate(
      templateId,
      "Studio 시간표 또는 썸네일 템플릿만 대표 이미지를 등록할 수 있습니다.",
    );

    if (template instanceof NextResponse) {
      return template;
    }

    const previousKey = getManagedCatalogCoverKey(template.thumbnail_url);
    if (previousKey === upload.fileKey) {
      // 이미 연결된 업로드를 다시 완료하면 현재 대표 이미지를 정리 대상으로 보지 않는다.
      uploadedKey = null;
      return NextResponse.json({
        template: { id: template.id, thumbnail_url: template.thumbnail_url },
        cleanupWarning: false,
      });
    }

    const validation = validateCatalogCoverUpload(upload);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    requirePublicUrl();
    const verificationError = await verifyUploadedCatalogCover(upload);
    if (verificationError) {
      return NextResponse.json({ error: verificationError }, { status: 400 });
    }

    const newUrl = getFileUrl(upload.fileKey);
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

    let cleanupWarning = false;
    if (previousKey) {
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
    console.error("Catalog cover upload error:", error);
    return NextResponse.json(
      { error: "대표 이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  } finally {
    await cleanupUploadedKey(uploadedKey);
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
    const template = await getStudioCatalogTemplate(
      templateId,
      "Studio 시간표 또는 썸네일 템플릿만 대표 이미지를 관리할 수 있습니다.",
    );

    if (template instanceof NextResponse) {
      return template;
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
