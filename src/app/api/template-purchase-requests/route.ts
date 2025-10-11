import { requireAuth } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authCheck = await requireAuth(request);

  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  try {
    const { user } = authCheck;
    const body = await request.json();
    const { template_id, plan_id, depositor_name } = body;

    // 입력 검증
    if (!template_id || !plan_id) {
      return NextResponse.json(
        { error: "템플릿 ID와 플랜 선택은 필수입니다." },
        { status: 400 }
      );
    }

    if (!depositor_name || depositor_name.trim().length === 0) {
      return NextResponse.json(
        { error: "입금자명은 필수입니다." },
        { status: 400 }
      );
    }

    // 템플릿 존재 확인
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, name")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 플랜 존재 확인
    const { data: plan, error: planError } = await supabase
      .from("template_plans")
      .select("id, plan, price")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "플랜을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 구매 요청 생성
    const { data: purchaseRequest, error: insertError } = await supabase
      .from("template_purchase_requests")
      .insert({
        template_id,
        user_id: Number(user.userId),
        plan_id,
        depositor_name: depositor_name.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Purchase request creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "구매 요청이 성공적으로 접수되었습니다.",
        purchaseRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Purchase request error:", error);
    return NextResponse.json(
      { error: "구매 요청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 사용자의 구매 요청 목록 조회
export async function GET(request: NextRequest) {
  const authCheck = await requireAuth(request);

  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  try {
    const { user } = authCheck;

    const { data: requests, error } = await supabase
      .from("template_purchase_requests")
      .select(
        `
        *,
        template:templates(id, name, description, thumbnail_url),
        template_plan:template_plans(id, plan, price)
      `
      )
      .eq("user_id", Number(user.userId))
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch purchase requests error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get purchase requests error:", error);
    return NextResponse.json(
      { error: "구매 요청 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
