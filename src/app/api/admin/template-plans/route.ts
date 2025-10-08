import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const {
      template_id,
      plan,
      is_artist,
      is_memo,
      is_multi_schedule,
      is_guerrilla,
      is_offline_memo,
    } = body;

    // 입력 검증
    if (!template_id || !plan) {
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

    // 템플릿이 존재하는지 확인
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 동일한 템플릿의 동일한 플랜이 이미 등록되어 있는지 확인
    const { data: existingPlan, error: checkError } = await supabase
      .from("template_plans")
      .select("id")
      .eq("template_id", template_id)
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
        { status: 409 }
      );
    }

    // 새 템플릿 플랜 생성
    const { data: newPlan, error: insertError } = await supabase
      .from("template_plans")
      .insert({
        template_id,
        plan,
        is_artist: is_artist || false,
        is_memo: is_memo || false,
        is_multi_schedule: is_multi_schedule || false,
        is_guerrilla: is_guerrilla || false,
        is_offline_memo: is_offline_memo || false,
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
    const template_id = searchParams.get("template_id");

    let query = supabase.from("template_plans").select("*");

    if (template_id) {
      query = query.eq("template_id", template_id);
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
