import { NextRequest, NextResponse } from "next/server";
import { EmailService } from "@/lib/email";
import { verifyJWT } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // JWT 토큰 검증
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
    }

    // 관리자 권한 확인
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const body = await request.json();
    const { template, email, name } = body;

    // 입력 데이터 검증
    if (!template || !email || !name) {
      return NextResponse.json(
        { error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    // 유효한 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "유효한 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // 임시 토큰 생성 (테스트용)
    const testToken = "test-token-" + Math.random().toString(36).substr(2, 9);
    
    let emailSent = false;

    // 템플릿에 따라 해당하는 이메일 발송
    switch (template) {
      case "verification":
        emailSent = await EmailService.sendEmailVerificationEmail(email, name, testToken);
        break;
      case "welcome":
        emailSent = await EmailService.sendWelcomeEmail(email, name);
        break;
      case "password_reset":
        emailSent = await EmailService.sendPasswordResetEmail(email, testToken);
        break;
      default:
        return NextResponse.json(
          { error: "지원하지 않는 템플릿입니다." },
          { status: 400 }
        );
    }

    if (!emailSent) {
      return NextResponse.json(
        { error: "이메일 발송에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "테스트 이메일이 성공적으로 발송되었습니다.",
      details: {
        template,
        recipient: email,
        name
      }
    });

  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}