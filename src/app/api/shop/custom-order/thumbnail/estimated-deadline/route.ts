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
    if (intake.accepting) {
      const { data: latestOrder, error } = await supabaseAdminServer
        .from("custom_thumbnail_orders")
        .select("deadline")
        .not("status", "in", '("completed","cancelled")')
        .not("deadline", "is", null)
        .order("deadline", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      latestDeadline = latestOrder?.deadline ?? null;
    }
    const estimatedDeadline = intake.accepting
      ? getThumbnailEstimatedDeadline(new Date(), latestDeadline)
      : null;

    return NextResponse.json({
      accepting: intake.accepting,
      latestDeadline,
      estimatedDeadline,
      timezone: "Asia/Seoul",
      weekdays: [0, 4],
      message:
        "기본 마감 요일은 목요일·일요일이며, 세부 일정은 협의 후 안내합니다.",
    });
  } catch (error) {
    console.error("Thumbnail estimated deadline error:", error);
    return NextResponse.json(
      { error: "썸네일 예상 마감일 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
