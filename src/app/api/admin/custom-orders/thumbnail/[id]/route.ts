import { requireAdmin } from "@/lib/auth/middleware";
import {
  getThumbnailOrderById,
  isThumbnailOrderStatus,
  ThumbnailOrderApiError,
} from "@/lib/custom-thumbnail-order";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import type { TablesUpdate } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

const toErrorResponse = (error: unknown) => {
  if (error instanceof ThumbnailOrderApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  console.error("Admin thumbnail order error:", error);
  return NextResponse.json(
    { error: "썸네일 주문 처리 중 오류가 발생했습니다." },
    { status: 500 },
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const order = await getThumbnailOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ order });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ThumbnailOrderApiError("요청 본문이 필요합니다.");
    }

    const status = body.status;
    if (status !== undefined && !isThumbnailOrderStatus(status)) {
      throw new ThumbnailOrderApiError("유효하지 않은 주문 상태입니다.");
    }
    if (status === "completed") {
      return NextResponse.json(
        {
          error:
            "썸네일 주문 완료는 결과 템플릿을 검증하는 전용 action으로 처리해야 합니다.",
        },
        { status: 409 },
      );
    }

    const updateData: TablesUpdate<"custom_thumbnail_orders"> = {
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) updateData.status = status;
    if (body.adminNotes !== undefined) {
      if (
        typeof body.adminNotes !== "string" ||
        body.adminNotes.length > 10_000
      ) {
        throw new ThumbnailOrderApiError(
          "adminNotes 항목이 유효하지 않습니다.",
        );
      }
      updateData.admin_notes = body.adminNotes.trim() || null;
    }
    if (body.priceQuoted !== undefined) {
      if (
        body.priceQuoted !== null &&
        (!Number.isInteger(body.priceQuoted) || body.priceQuoted < 0)
      ) {
        throw new ThumbnailOrderApiError(
          "priceQuoted 항목이 유효하지 않습니다.",
        );
      }
      updateData.price_quoted = body.priceQuoted;
    }
    if (body.deadline !== undefined) {
      if (
        body.deadline !== null &&
        !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)
      ) {
        throw new ThumbnailOrderApiError(
          "deadline 항목은 YYYY-MM-DD 형식이어야 합니다.",
        );
      }
      updateData.deadline = body.deadline;
    }

    const { data: order, error } = await supabaseAdminServer
      .from("custom_thumbnail_orders")
      .update(updateData)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!order) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const refreshed = await getThumbnailOrderById(id);
    return NextResponse.json({ order: refreshed });
  } catch (error) {
    return toErrorResponse(error);
  }
}
