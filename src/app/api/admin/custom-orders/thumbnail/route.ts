import { requireAdmin } from "@/lib/auth/middleware";
import {
  isThumbnailOrderStatus,
  listThumbnailOrders,
  ThumbnailOrderApiError,
} from "@/lib/custom-thumbnail-order";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const searchParams = request.nextUrl.searchParams;
    const rawStatus = searchParams.get("status");
    if (
      rawStatus &&
      rawStatus !== "all" &&
      rawStatus !== "default" &&
      !isThumbnailOrderStatus(rawStatus)
    ) {
      throw new ThumbnailOrderApiError("유효하지 않은 주문 상태입니다.");
    }

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 20)),
    );
    const sortBy =
      searchParams.get("sortBy") === "deadline" ? "deadline" : "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const result = await listThumbnailOrders({
      status: rawStatus,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      orders: result.orders,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    if (error instanceof ThumbnailOrderApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Admin thumbnail orders fetch error:", error);
    return NextResponse.json(
      { error: "썸네일 주문 내역 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
