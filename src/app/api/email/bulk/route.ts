import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { UserService } from "@/lib/supabase";
import { NodemailerService } from "@/lib/nodemailer";

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const authHeader = request.headers.get("authorization");
    const token = request.cookies.get("auth-token")?.value || authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    // 현재 사용자가 관리자인지 확인
    const currentUser = await UserService.findById(payload.userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관리자 이메일 목록에서 확인
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(currentUser.email)) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { emails } = body;

    // 입력 검증
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "발송할 이메일 목록이 필요합니다." },
        { status: 400 }
      );
    }

    // 일괄 발송 제한 (최대 100개)
    if (emails.length > 100) {
      return NextResponse.json(
        { error: "한 번에 최대 100개까지만 발송할 수 있습니다." },
        { status: 400 }
      );
    }

    // 각 이메일 데이터 검증
    for (const email of emails) {
      if (!email.to || !email.subject || !email.html) {
        return NextResponse.json(
          { error: "각 이메일에는 수신자, 제목, 내용이 모두 포함되어야 합니다." },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.to)) {
        return NextResponse.json(
          { error: `올바르지 않은 이메일 형식: ${email.to}` },
          { status: 400 }
        );
      }
    }

    // 개발 환경에서는 시뮬레이션
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === "development") {
      console.log("📧 [개발 모드] 일괄 이메일 발송 시뮬레이션:");
      console.log(`총 ${emails.length}개 이메일 발송 예정`);
      
      const simulatedResults = emails.map((email, index) => ({
        email: email.to,
        success: true,
        messageId: `dev-bulk-${Date.now()}-${index}@temis.local`,
      }));

      return NextResponse.json(
        {
          message: "개발 모드에서 일괄 이메일 발송이 시뮬레이션되었습니다.",
          success: emails.length,
          failed: 0,
          results: simulatedResults,
        },
        { status: 200 }
      );
    }

    // 프로덕션 환경에서 실제 일괄 발송
    const result = await NodemailerService.sendBulkEmails(emails);

    return NextResponse.json(
      {
        message: `일괄 이메일 발송 완료: 성공 ${result.success}개, 실패 ${result.failed}개`,
        success: result.success,
        failed: result.failed,
        results: result.results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Bulk email send error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}