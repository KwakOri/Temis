import { requireAdmin } from "@/lib/auth/middleware";
import { isUuid, ThumbnailOrderApiError } from "@/lib/custom-thumbnail-order";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import type { RevokeThumbnailOrderTemplateGrantResponse } from "@/types/customThumbnailOrder";
import { NextRequest, NextResponse } from "next/server";

const isRevokeResult = (
  value: unknown,
): value is Omit<RevokeThumbnailOrderTemplateGrantResponse, "success"> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return Boolean(result.grant && typeof result.accessDeleted === "boolean");
};

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; grantId: string }>;
  },
) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id: orderId, grantId } = await params;
    if (!isUuid(orderId) || !isUuid(grantId)) {
      throw new ThumbnailOrderApiError(
        "주문 ID와 권한 부여 ID가 유효한 UUID여야 합니다.",
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
      "revoke_custom_thumbnail_order_template_grant",
      {
        p_order_id: orderId,
        p_grant_id: grantId,
        p_admin_id: adminId,
      },
    );
    if (error) {
      const status =
        error.code === "P0002" || error.code === "no_data_found" ? 404 : 500;
      return NextResponse.json(
        { error: status === 500 ? "썸네일 권한 회수에 실패했습니다." : error.message },
        { status },
      );
    }

    if (!isRevokeResult(data)) {
      throw new Error("empty thumbnail grant revoke response");
    }

    return NextResponse.json({
      success: true,
      grant: data.grant,
      accessDeleted: data.accessDeleted,
    });
  } catch (error) {
    if (error instanceof ThumbnailOrderApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Admin thumbnail grant revoke error:", error);
    return NextResponse.json(
      { error: "썸네일 권한 회수 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
