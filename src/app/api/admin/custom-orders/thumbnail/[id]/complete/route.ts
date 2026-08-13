import { requireAdmin } from "@/lib/auth/middleware";
import { isUuid, ThumbnailOrderApiError } from "@/lib/custom-thumbnail-order";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import type { CompleteThumbnailCustomOrderResponse } from "@/types/customThumbnailOrder";
import { NextRequest, NextResponse } from "next/server";

const isCompletionResult = (
  value: unknown,
): value is CompleteThumbnailCustomOrderResponse => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return Boolean(result.order && result.access);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const resultTemplateId =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).resultTemplateId
        : null;

    if (!isUuid(orderId) || !isUuid(resultTemplateId)) {
      throw new ThumbnailOrderApiError(
        "주문 ID와 결과 템플릿 ID가 유효한 UUID여야 합니다.",
      );
    }

    const adminId = Number(adminCheck.user.userId);
    if (!Number.isInteger(adminId) || adminId <= 0) {
      throw new ThumbnailOrderApiError(
        "관리자 사용자 정보가 유효하지 않습니다.",
        401,
      );
    }

    const { data, error } = await supabaseAdminServer.rpc(
      "complete_custom_thumbnail_order",
      {
        p_order_id: orderId,
        p_result_template_id: resultTemplateId,
        p_admin_id: adminId,
      },
    );
    if (error) {
      const status =
        error.code === "P0002" || error.code === "no_data_found"
          ? 404
          : error.code === "235 check_violation" || error.code === "23514"
            ? 409
            : error.code === "23505"
              ? 409
              : 500;
      return NextResponse.json(
        {
          error:
            status === 500
              ? "썸네일 주문 완료 처리에 실패했습니다."
              : error.message,
        },
        { status },
      );
    }

    if (!isCompletionResult(data)) {
      throw new Error("empty thumbnail completion response");
    }

    return NextResponse.json({
      success: true,
      order: data.order,
      access: data.access,
    });
  } catch (error) {
    if (error instanceof ThumbnailOrderApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Admin thumbnail order completion error:", error);
    return NextResponse.json(
      { error: "썸네일 주문 완료 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
