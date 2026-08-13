import { requireAdmin } from "@/lib/auth/middleware";
import {
  TemplateHubParamError,
  listTemplateHubTemplates,
  parseTemplateHubListParams,
} from "@/services/server/templateHubService";
import type { TemplateHubErrorResponse } from "@/types/template-hub";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = parseTemplateHubListParams(searchParams);
    const result = await listTemplateHubTemplates(params);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TemplateHubParamError) {
      return NextResponse.json<TemplateHubErrorResponse>(
        { code: "INVALID_PARAM", message: error.message },
        { status: 400 }
      );
    }

    console.error("Template hub list error:", error);
    return NextResponse.json<TemplateHubErrorResponse>(
      {
        code: "INTERNAL_ERROR",
        message: "템플릿 목록 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
