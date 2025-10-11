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
    const body = await request.json();
    const product = await params;
    const productId = product.id;

    // 상품이 존재하는지 확인
    const { data: existingProduct, error: checkError } = await supabase
      .from("shop_templates")
      .select("id, template_id")
      .eq("id", productId)
      .single();

    if (checkError || !existingProduct) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트할 필드들 준비
    const updateData: Partial<Tables<"shop_templates">> = {};

    if (body.title !== undefined) updateData.title = body.title?.trim() || null;
    if (body.features !== undefined) updateData.features = body.features;
    if (body.requirements !== undefined)
      updateData.requirements = body.requirements?.trim() || null;
    if (body.purchase_instructions !== undefined)
      updateData.purchase_instructions =
        body.purchase_instructions?.trim() || null;
    if (body.is_artist !== undefined) updateData.is_artist = body.is_artist;
    if (body.is_memo !== undefined) updateData.is_memo = body.is_memo;
    if (body.is_multi_schedule !== undefined)
      updateData.is_multi_schedule = body.is_multi_schedule;
    if (body.is_guerrilla !== undefined)
      updateData.is_guerrilla = body.is_guerrilla;
    if (body.is_offline_memo !== undefined)
      updateData.is_offline_memo = body.is_offline_memo;
    if (body.is_shop_visible !== undefined)
      updateData.is_shop_visible = body.is_shop_visible;

    // 상품 정보 업데이트
    const { data: updatedProduct, error: updateError } = await supabase
      .from("shop_templates")
      .update(updateData)
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      console.error("Shop template update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "상품 정보가 성공적으로 업데이트되었습니다.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Shop template update error:", error);
    return NextResponse.json(
      { error: "상품 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
