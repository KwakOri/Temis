import { requireAdmin } from "@/lib/auth/middleware";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_STATUSES = ["pending", "approved", "rejected", "completed"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  const { id: requestId } = await params;

  try {
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태 값입니다." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdminServer
      .from("template_purchase_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase request status update error:", error);
    return NextResponse.json(
      { error: "구매 요청 상태 업데이트에 실패했습니다." },
      { status: 500 }
    );
  }
}
