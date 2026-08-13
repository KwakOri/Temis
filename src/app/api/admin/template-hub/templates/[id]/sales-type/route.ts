import { requireAdmin } from "@/lib/auth/middleware";
import {
  TemplateHubNotFoundError,
  TemplateHubSaleMustStopFirstError,
  updateTemplateSalesType,
} from "@/services/server/templateHubService";
import {
  TEMPLATE_SALES_TYPES,
  type TemplateHubErrorResponse,
  type TemplateHubItemResponse,
  type TemplateSalesType,
} from "@/types/template-hub";
import { NextRequest, NextResponse } from "next/server";

const isTemplateSalesType = (value: unknown): value is TemplateSalesType =>
  typeof value === "string" &&
  (TEMPLATE_SALES_TYPES as readonly string[]).includes(value);

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
    const salesType = (body as { salesType?: unknown } | null)?.salesType;

    if (!isTemplateSalesType(salesType)) {
      return NextResponse.json<TemplateHubErrorResponse>(
        {
          code: "INVALID_PARAM",
          message: `salesType은 ${TEMPLATE_SALES_TYPES.join(", ")} 중 하나여야 합니다.`,
        },
        { status: 400 }
      );
    }

    const item = await updateTemplateSalesType(id, salesType);

    return NextResponse.json<TemplateHubItemResponse>({ item });
  } catch (error) {
    if (error instanceof TemplateHubNotFoundError) {
      return NextResponse.json<TemplateHubErrorResponse>(
        { code: "TEMPLATE_NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    if (error instanceof TemplateHubSaleMustStopFirstError) {
      return NextResponse.json<TemplateHubErrorResponse>(
        { code: "SALE_MUST_STOP_FIRST", message: error.message },
        { status: 409 }
      );
    }

    console.error("Template hub sales-type update error:", error);
    return NextResponse.json<TemplateHubErrorResponse>(
      {
        code: "INTERNAL_ERROR",
        message: "판매 유형 변경 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
