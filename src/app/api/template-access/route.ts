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

    // 3. 관리자 권한 확인 (이메일 직접 비교 + role 확인)
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];

    // 두 가지 방법으로 관리자 확인: role 필드 또는 이메일 매칭
    const isUserAdminByRole = user.role === "admin";
    const isUserAdminByEmail = user.email && adminEmails.includes(user.email);
    const isUserAdmin = isUserAdminByRole || isUserAdminByEmail;

    if (isUserAdmin) {
      // 관리자는 모든 템플릿에 접근 가능

      return NextResponse.json({
        hasAccess: true,
        isAdmin: true,
        reason: "admin_access",
      });
    }

    // 4. 일반 사용자는 template_access 테이블 확인
    const hasTemplateAccess = await TemplateService.hasAccess(
      templateId,
      String(user.userId)
    );

    return NextResponse.json({
      hasAccess: hasTemplateAccess,
      isAdmin: false,
      reason: hasTemplateAccess ? "template_access" : "no_access",
    });
  } catch (error) {
    console.error("Template access check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
