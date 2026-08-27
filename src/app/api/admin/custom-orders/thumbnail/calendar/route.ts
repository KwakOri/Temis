import { requireAdmin } from "@/lib/auth/middleware";
import {
  listThumbnailOrders,
  ThumbnailOrderApiError,
} from "@/lib/custom-thumbnail-order";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    if (
      !startDate ||
      !endDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      throw new ThumbnailOrderApiError(
        "startDate와 endDate는 YYYY-MM-DD 형식이어야 합니다.",
      );
    }

    const result = await listThumbnailOrders({
      status: "all",
      page: 1,
      limit: 100,
      sortBy: "deadline",
      sortOrder: "asc",
      deadlineFrom: startDate,
      deadlineTo: endDate,
    });

    return NextResponse.json({
      orders: result.orders,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    if (error instanceof ThumbnailOrderApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Thumbnail calendar fetch error:", error);
    return NextResponse.json(
      { error: "썸네일 캘린더 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
