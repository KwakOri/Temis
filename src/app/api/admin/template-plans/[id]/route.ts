import { requireAdmin } from "@/lib/auth/middleware";
import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
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
    const { id: planId } = await params;

    // 플랜이 존재하는지 확인
    const { data: existingPlan, error: checkError } = await supabase
      .from("template_plans")
      .select("id, shop_template_id, plan")
      .eq("id", planId)
      .single();

    if (checkError || !existingPlan) {
      return NextResponse.json(
        { error: "템플릿 플랜을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: shopTemplate, error: shopTemplateError } = await supabase
      .from("shop_templates")
      .select("template_id")
      .eq("id", existingPlan.shop_template_id)
      .single();

    if (shopTemplateError || !shopTemplate?.template_id) {
      return NextResponse.json(
        { error: "플랜에 연결된 상점 상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("template_engine, template_kind")
      .eq("id", shopTemplate.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "플랜에 연결된 템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const isThumbnailTemplate =
      template.template_engine === "studio" &&
      template.template_kind === "thumbnail";

    if (isThumbnailTemplate && existingPlan.plan !== "pro") {
      return NextResponse.json(
        { error: "썸네일 상품은 PRO 플랜만 사용할 수 있습니다." },
        { status: 400 },
      );
    }

    // 업데이트할 필드들 준비
    const updateData: Partial<Tables<"template_plans">> = {};

    if (body.price !== undefined) {
      if (
        body.price !== null &&
        (typeof body.price !== "number" ||
          !Number.isFinite(body.price) ||
          body.price < 0)
      ) {
        return NextResponse.json(
          { error: "가격은 0 이상의 숫자여야 합니다." },
          { status: 400 },
        );
      }
      updateData.price = body.price;
    }

    if (isThumbnailTemplate) {
      updateData.is_artist = false;
      updateData.is_memo = false;
      updateData.is_multi_schedule = false;
      updateData.is_guerrilla = false;
      updateData.is_offline_memo = false;
    } else {
      if (body.is_artist !== undefined)
        updateData.is_artist = Boolean(body.is_artist);
      if (body.is_memo !== undefined)
        updateData.is_memo = Boolean(body.is_memo);
      if (body.is_multi_schedule !== undefined)
        updateData.is_multi_schedule = Boolean(body.is_multi_schedule);
      if (body.is_guerrilla !== undefined)
        updateData.is_guerrilla = Boolean(body.is_guerrilla);
      if (body.is_offline_memo !== undefined)
        updateData.is_offline_memo = Boolean(body.is_offline_memo);
    }

    // 플랜 정보 업데이트
    const { data: updatedPlan, error: updateError } = await supabase
      .from("template_plans")
      .update(updateData)
      .eq("id", planId)
      .select()
      .single();

    if (updateError) {
      console.error("Template plan update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "템플릿 플랜이 성공적으로 업데이트되었습니다.",
      plan: updatedPlan,
    });
  } catch (error) {
    console.error("Template plan update error:", error);
    return NextResponse.json(
      { error: "템플릿 플랜 업데이트 중 오류가 발생했습니다." },
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
    const { id: planId } = await params;

    // 플랜이 존재하는지 확인
    const { data: existingPlan, error: checkError } = await supabase
      .from("template_plans")
      .select("id")
      .eq("id", planId)
      .single();

    if (checkError || !existingPlan) {
      return NextResponse.json(
        { error: "템플릿 플랜을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 플랜 삭제
    const { error: deleteError } = await supabase
      .from("template_plans")
      .delete()
      .eq("id", planId);

    if (deleteError) {
      console.error("Template plan deletion error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "템플릿 플랜이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Template plan deletion error:", error);
    return NextResponse.json(
      { error: "템플릿 플랜 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
