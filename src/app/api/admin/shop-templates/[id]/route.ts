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

    const templateId = existingProduct.template_id;
    if (!templateId) {
      return NextResponse.json(
        { error: "템플릿 연결 정보가 없는 상품입니다." },
        { status: 400 }
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
    if (body.detailed_description !== undefined)
      updateData.detailed_description = body.detailed_description?.trim() || null;
    if (body.is_artist !== undefined) updateData.is_artist = body.is_artist;
    if (body.is_memo !== undefined) updateData.is_memo = body.is_memo;
    if (body.is_multi_schedule !== undefined)
      updateData.is_multi_schedule = body.is_multi_schedule;
    if (body.is_guerrilla !== undefined)
      updateData.is_guerrilla = body.is_guerrilla;
    if (body.is_offline_memo !== undefined)
      updateData.is_offline_memo = body.is_offline_memo;

    // 판매 시작 시 필수 조건 검증
    if (body.is_shop_visible === true) {
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("id, is_public")
        .eq("id", templateId)
        .single();

      if (templateError || !template) {
        return NextResponse.json(
          { error: "연결된 템플릿을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (!template.is_public) {
        return NextResponse.json(
          { error: "비공개 템플릿은 판매를 시작할 수 없습니다." },
          { status: 400 }
        );
      }

      const { count: artistCount, error: artistCountError } = await supabase
        .from("template_artists")
        .select("id", { count: "exact", head: true })
        .eq("template_id", templateId);

      if (artistCountError) {
        throw artistCountError;
      }

      if (!artistCount || artistCount === 0) {
        return NextResponse.json(
          {
            error:
              "작가 미연결 상태에서는 판매를 시작할 수 없습니다. '테미스' 또는 실제 작가를 연결해 주세요.",
          },
          { status: 400 }
        );
      }
    }

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
