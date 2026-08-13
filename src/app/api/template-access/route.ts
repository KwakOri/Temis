import { requireAuth } from "@/lib/auth/middleware";
import { TemplateService } from "@/lib/templates";
import { NextRequest, NextResponse } from "next/server";

/**
 * 템플릿 접근 권한을 안전하게 검증하는 API
 * GET /api/template-access?templateId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 확인
    const authResult = await requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult; // 인증 실패
    }

    const { user } = authResult;

    // 2. 쿼리 파라미터에서 templateId 추출
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId parameter is required" },
        { status: 400 }
      );
    }

    // Validate templateId is a UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID format" },
        { status: 400 }
      );
    }

    // 3. 관리자 우회를 포함한 공통 이용 권한 판정
    const entitlement = await TemplateService.resolveEntitlement(
      templateId,
      user
    );

    return NextResponse.json(entitlement);
  } catch (error) {
    console.error("Template access check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
