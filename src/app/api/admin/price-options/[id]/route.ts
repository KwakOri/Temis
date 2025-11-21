import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { UpdatePriceOptionInput } from "@/types/priceOption";
import { NextRequest, NextResponse } from "next/server";

// GET: 특정 가격 옵션 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;

    const { data: option, error } = await supabase
      .from("price_options")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "가격 옵션을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      option,
    });
  } catch (error) {
    console.error("Price option fetch error:", error);
    return NextResponse.json(
      { error: "가격 옵션 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: 가격 옵션 수정
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
    const body: UpdatePriceOptionInput = await request.json();

    // 기존 옵션 확인
    const { data: existingOption, error: checkError } = await supabase
      .from("price_options")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError || !existingOption) {
      return NextResponse.json(
        { error: "가격 옵션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // value 중복 검사 (같은 카테고리 내에서, 자기 자신 제외)
    if (body.value && body.category) {
      const { data: duplicateOption, error: dupError } = await supabase
        .from("price_options")
        .select("id")
        .eq("category", body.category.trim())
        .eq("value", body.value.trim())
        .neq("id", id)
        .single();

      if (dupError && dupError.code !== "PGRST116") {
        throw dupError;
      }

      if (duplicateOption) {
        return NextResponse.json(
          { error: "해당 카테고리에 이미 존재하는 옵션 값입니다." },
          { status: 409 }
        );
      }
    }

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.label !== undefined) updateData.label = body.label.trim();
    if (body.value !== undefined) updateData.value = body.value.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.is_discount !== undefined) updateData.is_discount = Boolean(body.is_discount);
    if (body.is_enabled !== undefined) updateData.is_enabled = Boolean(body.is_enabled);

    const { data: updatedOption, error: updateError } = await supabase
      .from("price_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Price option update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "가격 옵션이 성공적으로 수정되었습니다.",
      option: updatedOption,
    });
  } catch (error) {
    console.error("Price option update error:", error);
    return NextResponse.json(
      { error: "가격 옵션 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 가격 옵션 삭제
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

    // 기존 옵션 확인
    const { data: existingOption, error: checkError } = await supabase
      .from("price_options")
      .select("id, label")
      .eq("id", id)
      .single();

    if (checkError || !existingOption) {
      return NextResponse.json(
        { error: "가격 옵션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("price_options")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Price option delete error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `'${existingOption.label}' 옵션이 성공적으로 삭제되었습니다.`,
    });
  } catch (error) {
    console.error("Price option delete error:", error);
    return NextResponse.json(
      { error: "가격 옵션 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
