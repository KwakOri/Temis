import { requireAdmin } from "@/lib/auth/middleware";
import {
  TemplateHubNotFoundError,
  TemplateHubSaleNotReadyError,
  updateTemplateSaleVisibility,
} from "@/services/server/templateHubService";
import type {
  TemplateHubErrorResponse,
  TemplateHubItemResponse,
} from "@/types/template-hub";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const visible = (body as { visible?: unknown } | null)?.visible;

    if (typeof visible !== "boolean") {
      return NextResponse.json<TemplateHubErrorResponse>(
        { code: "INVALID_PARAM", message: "visible은 boolean이어야 합니다." },
        { status: 400 }
      );
    }

    const item = await updateTemplateSaleVisibility(id, visible);

    return NextResponse.json<TemplateHubItemResponse>({ item });
  } catch (error) {
    if (error instanceof TemplateHubNotFoundError) {
      return NextResponse.json<TemplateHubErrorResponse>(
        { code: "TEMPLATE_NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    if (error instanceof TemplateHubSaleNotReadyError) {
      return NextResponse.json<TemplateHubErrorResponse>(
        {
          code: "SALE_NOT_READY",
          message: error.message,
          reasons: error.reasons,
        },
        { status: 409 }
      );
    }

    console.error("Template hub sale update error:", error);
    return NextResponse.json<TemplateHubErrorResponse>(
      { code: "INTERNAL_ERROR", message: "판매 상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
