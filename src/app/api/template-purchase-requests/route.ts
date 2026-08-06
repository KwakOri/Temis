import { requireAuth } from "@/lib/auth/middleware";
import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authCheck = await requireAuth(request);

  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  try {
    const { user } = authCheck;
    const userId = Number(user.userId);
    const body = await request.json();
    const { template_id, plan_id, depositor_name, customer_phone, message } =
      body;

    // 입력 검증
    if (!template_id) {
      return NextResponse.json(
        { error: "템플릿 ID는 필수입니다." },
        { status: 400 },
      );
    }

    if (!plan_id) {
      return NextResponse.json(
        { error: "플랜 선택은 필수입니다." },
        { status: 400 },
      );
    }

    if (!depositor_name || depositor_name.trim().length === 0) {
      return NextResponse.json(
        { error: "입금자명은 필수입니다." },
        { status: 400 },
      );
    }

    // 템플릿 존재 및 일반 판매 상태 확인
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, name, is_public, status")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!template.is_public || template.status !== "published") {
      return NextResponse.json(
        { error: "구매할 수 없는 템플릿입니다." },
        { status: 400 },
      );
    }

    // 플랜이 실제로 이 템플릿의 상점 상품에 속하는지 확인 (다른 상품 plan_id를
    // 붙여 원하는 템플릿 권한을 얻는 것을 막는다).
    const { data: plan, error: planError } = await supabase
      .from("template_plans")
      .select(
        "id, plan, price, shop_template:shop_templates!inner(template_id, is_shop_visible)",
      )
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "플랜을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const shopTemplate = Array.isArray(plan.shop_template)
      ? plan.shop_template[0]
      : plan.shop_template;

    if (!shopTemplate || shopTemplate.template_id !== template_id) {
      return NextResponse.json(
        { error: "선택한 플랜이 요청한 템플릿과 일치하지 않습니다." },
        { status: 400 },
      );
    }

    if (!shopTemplate.is_shop_visible) {
      return NextResponse.json(
        { error: "현재 판매 중이 아닌 템플릿입니다." },
        { status: 400 },
      );
    }

    const { data: accessRows, error: accessError } = await supabase
      .from("template_access")
      .select("id")
      .eq("template_id", template_id)
      .eq("user_id", userId)
      .limit(1);

    if (accessError) {
      console.error("Purchase request access check error:", accessError);
      throw accessError;
    }

    if ((accessRows ?? []).length > 0) {
      return NextResponse.json(
        {
          code: "ALREADY_HAS_ACCESS",
          error:
            "이미 이용 권한이 있는 템플릿입니다. 마이페이지에서 사용해 주세요.",
        },
        { status: 409 },
      );
    }

    const { data: pendingRows, error: pendingError } = await supabase
      .from("template_purchase_requests")
      .select("id, created_at, plan_id")
      .eq("template_id", template_id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (pendingError) {
      console.error("Pending purchase request check error:", pendingError);
      throw pendingError;
    }

    const pendingRequest = pendingRows?.[0];
    if (pendingRequest) {
      return NextResponse.json(
        {
          code: "PENDING_REQUEST_EXISTS",
          error:
            "이미 처리 대기 중인 구매 신청이 있습니다. 구매 내역에서 확인해 주세요.",
          purchaseRequest: pendingRequest,
        },
        { status: 409 },
      );
    }

    // 구매 요청 생성
    const { data: purchaseRequest, error: insertError } = await supabase
      .from("template_purchase_requests")
      .insert({
        template_id,
        user_id: userId,
        plan_id,
        depositor_name: depositor_name.trim(),
        customer_phone:
          typeof customer_phone === "string" && customer_phone.trim().length > 0
            ? customer_phone.trim()
            : null,
        message:
          typeof message === "string" && message.trim().length > 0
            ? message.trim()
            : null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            code: "PENDING_REQUEST_EXISTS",
            error:
              "이미 처리 대기 중인 구매 신청이 있습니다. 구매 내역에서 확인해 주세요.",
          },
          { status: 409 },
        );
      }

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
