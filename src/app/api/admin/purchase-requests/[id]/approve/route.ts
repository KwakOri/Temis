import { requireAdmin } from "@/lib/auth/middleware";
import { EmailService } from "@/lib/email";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  const { id: requestId } = await params;
  const { user: admin } = adminCheck;

  try {
    const { data: purchaseRequest, error: requestError } =
      await supabaseAdminServer
        .from("template_purchase_requests")
        .select("id, template_id, user_id")
        .eq("id", requestId)
        .single();

    if (requestError || !purchaseRequest) {
      return NextResponse.json(
        { error: "구매 요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 접근 권한 부여와 구매 요청 완료 처리를 하나의 트랜잭션으로 실행 (idempotent upsert).
    // plan은 요청 자체에 이미 기록된 값만 쓴다 — 클라이언트가 다른 plan_id를
    // 보내 원하는 템플릿 권한을 다른 상품 가격으로 부여받는 것을 막는다.
    const { error: approveError } = await supabaseAdminServer.rpc(
      "approve_template_purchase_request",
      {
        p_request_id: requestId,
        p_admin_id: Number(admin.userId),
      }
    );

    if (approveError) {
      throw approveError;
    }

    // 이메일 발송 (선택적, 실패해도 승인 자체는 유지)
    try {
      const [{ data: user }, { data: template }] = await Promise.all([
        supabaseAdminServer
          .from("users")
          .select("name, email")
          .eq("id", purchaseRequest.user_id)
          .single(),
        supabaseAdminServer
          .from("templates")
          .select("name")
          .eq("id", purchaseRequest.template_id)
          .single(),
      ]);

      if (user && template) {
        await EmailService.sendTemplateAccessGrantedEmail(
          user.email,
          user.name || "고객",
          template.name
        );
      }
    } catch (emailError) {
      console.error("권한 부여 알림 메일 발송 실패:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase request approval error:", error);
    return NextResponse.json(
      { error: "권한 부여에 실패했습니다." },
      { status: 500 }
    );
  }
}
