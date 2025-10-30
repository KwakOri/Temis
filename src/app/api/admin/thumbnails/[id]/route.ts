import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // 썸네일이 존재하는지 확인
    const { data: existingThumbnail, error: checkError } = await supabase
      .from("thumbnails")
      .select("id, name, is_public")
      .eq("id", id)
      .single();

    if (checkError || !existingThumbnail) {
      return NextResponse.json(
        { error: "썸네일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트할 필드들 준비
    const updateData: Partial<Tables<"thumbnails">> = {};

    if (body.name !== undefined) updateData.name = body.name?.trim() || null;
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || "";
    if (body.detailed_description !== undefined)
      updateData.detailed_description =
        body.detailed_description?.trim() || null;
    if (body.thumbnail_url !== undefined)
      updateData.thumbnail_url = body.thumbnail_url?.trim() || "";
    if (body.is_public !== undefined)
      updateData.is_public = Boolean(body.is_public);
    if (body.is_shop_visible !== undefined)
      updateData.is_shop_visible = Boolean(body.is_shop_visible);

    // 업데이트 데이터에 updated_at 추가
    updateData.updated_at = new Date().toISOString();

    // 썸네일 정보 업데이트
    const { data: thumbnail, error } = await supabase
      .from("thumbnails")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Thumbnail update error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "썸네일이 성공적으로 업데이트되었습니다.",
      thumbnail,
    });
  } catch (error) {
    console.error("Thumbnail update error:", error);
    return NextResponse.json(
      { error: "썸네일 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;

    // 썸네일이 존재하는지 확인
    const { data: existingThumbnail, error: checkError } = await supabase
      .from("thumbnails")
      .select("id, name")
      .eq("id", id)
      .single();

    if (checkError || !existingThumbnail) {
      return NextResponse.json(
        { error: "썸네일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 썸네일 삭제
    const { error: deleteError } = await supabase
      .from("thumbnails")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Thumbnail deletion error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "썸네일이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Thumbnail deletion error:", error);
    return NextResponse.json(
      { error: "썸네일 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
