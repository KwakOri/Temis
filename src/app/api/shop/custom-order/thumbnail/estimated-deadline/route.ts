import { getCurrentUserId } from "@/lib/auth/jwt";
import {
  getThumbnailOrderIntakeStatus,
  listThumbnailOrders,
} from "@/lib/custom-thumbnail-order";
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
    const activeOrders = intake.accepting
      ? await listThumbnailOrders({ userId: undefined, limit: 100 })
      : null;
    const latestDeadline =
      activeOrders?.orders
        .filter(
          (order) =>
            order.status !== "completed" &&
            order.status !== "cancelled" &&
            Boolean(order.deadline),
        )
        .map((order) => order.deadline as string)
        .sort()
        .at(-1) ?? null;

    return NextResponse.json({
      accepting: intake.accepting,
      latestDeadline,
      estimatedDeadline: null,
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
