import { requireAdmin } from "@/lib/auth/middleware";
import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const {
      shop_template_id,
      plan,
      price,
      is_artist,
      is_memo,
      is_multi_schedule,
      is_guerrilla,
      is_offline_memo,
    } = body;

    // 입력 검증
    if (!shop_template_id || !plan) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!["lite", "pro"].includes(plan)) {
      return NextResponse.json(
        { error: "플랜은 'lite' 또는 'pro'만 가능합니다." },
        { status: 400 }
      );
    }

    // shop_template이 존재하는지 확인
    const { data: shopTemplate, error: shopTemplateError } = await supabase
      .from("shop_templates")
      .select("id, template_id")
      .eq("id", shop_template_id)
      .single();

    if (shopTemplateError || !shopTemplate || !shopTemplate.template_id) {
      return NextResponse.json(
        { error: "상점 템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const templateId = shopTemplate.template_id;
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("template_engine, template_kind")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "상점 템플릿에 연결된 템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const isThumbnailTemplate =
      template.template_engine === "studio" &&
      template.template_kind === "thumbnail";

    if (isThumbnailTemplate && plan !== "pro") {
      return NextResponse.json(
        { error: "썸네일 상품은 PRO 플랜만 등록할 수 있습니다." },
        { status: 400 },
      );
    }

    if (
      price !== null &&
      price !== undefined &&
      (typeof price !== "number" || !Number.isFinite(price) || price < 0)
    ) {
      return NextResponse.json(
        { error: "가격은 0 이상의 숫자여야 합니다." },
        { status: 400 },
      );
    }

    // 동일한 shop_template의 동일한 플랜이 이미 등록되어 있는지 확인
    const { data: existingPlan, error: checkError } = await supabase
      .from("template_plans")
      .select("id")
      .eq("shop_template_id", shop_template_id)
      .eq("plan", plan)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Template plan check error:", checkError);
      throw checkError;
    }

    if (existingPlan) {
      return NextResponse.json(
        {
          error: `이미 ${plan === "pro" ? "PRO" : "LITE"} 플랜이 등록되어 있습니다.`,
        },
        { status: 409 },
      );
    }

    // 새 템플릿 플랜 생성
    const { data: newPlan, error: insertError } = await supabase
      .from("template_plans")
      .insert({
        shop_template_id,
        plan,
        price: price ?? null,
        is_artist: isThumbnailTemplate ? false : Boolean(is_artist),
        is_memo: isThumbnailTemplate ? false : Boolean(is_memo),
        is_multi_schedule: isThumbnailTemplate
          ? false
          : Boolean(is_multi_schedule),
        is_guerrilla: isThumbnailTemplate ? false : Boolean(is_guerrilla),
        is_offline_memo: isThumbnailTemplate ? false : Boolean(is_offline_memo),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Template plan creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "템플릿 플랜이 성공적으로 등록되었습니다.",
        plan: newPlan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Template plan creation error:", error);
    return NextResponse.json(
      { error: "템플릿 플랜 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const shop_template_id = searchParams.get("shop_template_id");

    let query = supabase.from("template_plans").select("*");

    if (shop_template_id) {
      query = query.eq("shop_template_id", shop_template_id);
    }

    const { data: plans, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Template plans fetch error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      plans: plans || [],
    });
  } catch (error) {
    console.error("Template plans fetch error:", error);
    return NextResponse.json(
      { error: "템플릿 플랜 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
