import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { UpdateAdminOptionInput } from "@/types/adminOption";
import { NextRequest, NextResponse } from "next/server";

// PATCH: 관리자 옵션 수정
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
    const body: UpdateAdminOptionInput = await request.json();
    const { label, value, description, price, is_discount, is_enabled } = body;

    // 옵션 존재 확인
    const { data: existingOption, error: fetchError } = await supabase
      .from("admin_options")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "옵션을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    // value 변경 시 중복 검사 (자기 자신 제외)
    if (value && value !== existingOption.value) {
      const { data: duplicateOption, error: checkError } = await supabase
        .from("admin_options")
        .select("id")
        .eq("category", existingOption.category)
        .eq("value", value.trim())
        .neq("id", id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (duplicateOption) {
        return NextResponse.json(
          { error: "해당 카테고리에 이미 존재하는 옵션 값입니다." },
          { status: 409 }
        );
      }
    }

    // 업데이트할 필드만 포함
    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label.trim();
    if (value !== undefined) updateData.value = value.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (price !== undefined) updateData.price = price;
    if (is_discount !== undefined) updateData.is_discount = Boolean(is_discount);
    if (is_enabled !== undefined) updateData.is_enabled = Boolean(is_enabled);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "수정할 내용이 없습니다." },
        { status: 400 }
      );
    }

    const { data: updatedOption, error: updateError } = await supabase
      .from("admin_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Admin option update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "관리자 옵션이 성공적으로 수정되었습니다.",
      option: updatedOption,
    });
  } catch (error) {
    console.error("Admin option update error:", error);
    return NextResponse.json(
      { error: "관리자 옵션 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 관리자 옵션 삭제
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

    // 옵션 존재 확인
    const { data: existingOption, error: fetchError } = await supabase
      .from("admin_options")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "옵션을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    const { error: deleteError } = await supabase
      .from("admin_options")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Admin option delete error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "관리자 옵션이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Admin option delete error:", error);
    return NextResponse.json(
      { error: "관리자 옵션 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
