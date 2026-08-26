import { getCurrentUserId } from "@/lib/auth/jwt";
import { getThumbnailOrderIntakeStatus } from "@/lib/custom-thumbnail-order";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { getThumbnailEstimatedDeadline } from "@/utils/thumbnail-deadline";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const intake = await getThumbnailOrderIntakeStatus();
    let latestDeadline: string | null = null;
    let pendingOrderCount = 0;
    if (intake.accepting) {
      const [latestOrderResult, pendingOrderResult] = await Promise.all([
        supabaseAdminServer
          .from("custom_thumbnail_orders")
          .select("deadline")
          .not("status", "in", '("completed","cancelled")')
          .not("deadline", "is", null)
          .order("deadline", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdminServer
          .from("custom_thumbnail_orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      if (latestOrderResult.error) throw latestOrderResult.error;
      if (pendingOrderResult.error) throw pendingOrderResult.error;

      const latestOrder = latestOrderResult.data;
      latestDeadline = latestOrder?.deadline ?? null;
      pendingOrderCount = pendingOrderResult.count ?? 0;
    }
    const estimatedDeadline = intake.accepting
      ? getThumbnailEstimatedDeadline(
          new Date(),
          latestDeadline,
          pendingOrderCount,
        )
      : null;

    return NextResponse.json({
      accepting: intake.accepting,
      latestDeadline,
      pendingOrderCount,
      estimatedDeadline,
      timezone: "Asia/Seoul",
      message:
        "가장 마지막 마감일을 기준으로 확인 대기 주문마다 2일을 반영합니다.",
    });
  } catch (error) {
    console.error("Thumbnail estimated deadline error:", error);
    return NextResponse.json(
      { error: "썸네일 예상 마감일 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
