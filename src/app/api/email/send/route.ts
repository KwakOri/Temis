import { NextRequest, NextResponse } from "next/server";
import { NodemailerService } from "@/lib/nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, type } = body;

    // 입력 검증
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "수신자, 제목, 내용은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 허용된 이메일 타입 검증
    const allowedTypes = ["password_reset", "signup_invite", "welcome"];
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "허용되지 않은 이메일 타입입니다." },
        { status: 400 }
      );
    }

    // 개발 환경에서는 콘솔 로그만 출력
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === "development") {
      
      return NextResponse.json(
        {
          message: "개발 모드에서 이메일 발송이 시뮬레이션되었습니다.",
          simulatedData: {
            to,
            subject,
            type,
            messageId: `dev-${Date.now()}@temis.local`,
          },
        },
        { status: 200 }
      );
    }

    // 프로덕션 환경에서 실제 이메일 발송
    const result = await NodemailerService.sendEmail({
      to,
      subject,
      html,
      type,
    });

    if (result.success) {
      return NextResponse.json(
        {
          message: "이메일이 성공적으로 발송되었습니다.",
          messageId: result.messageId,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.error || "이메일 발송에 실패했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Email send API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// SMTP 연결 테스트 엔드포인트 (개발/관리용)
export async function GET(request: NextRequest) {
  try {
    // 운영 환경에서는 접근 제한
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === "production") {
      return NextResponse.json(
        { error: "프로덕션 환경에서는 사용할 수 없습니다." },
        { status: 403 }
      );
    }

    const connectionTest = await NodemailerService.verifyConnection();
    
    return NextResponse.json(
      {
        message: connectionTest 
          ? "SMTP 연결이 정상적으로 작동합니다." 
          : "SMTP 연결에 문제가 있습니다.",
        success: connectionTest,
        config: {
          gmailUser: process.env.GMAIL_USER ? "설정됨" : "설정되지 않음",
          gmailPass: process.env.GMAIL_PASS ? "설정됨" : "설정되지 않음",
        },
      },
      { status: connectionTest ? 200 : 500 }
    );
  } catch (error) {
    console.error("SMTP test error:", error);
    return NextResponse.json(
      { error: "SMTP 테스트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}