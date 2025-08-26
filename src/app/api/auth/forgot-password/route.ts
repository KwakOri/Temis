import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/supabase";
import { TokenService } from "@/lib/token";
import { EmailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // 입력 검증
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "이메일은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const user = await UserService.findByEmail(email);
    
    if (!user) {
      // 보안상 사용자가 존재하지 않아도 성공 응답
      // 실제로는 이메일을 발송하지 않음
      return NextResponse.json(
        {
          message: "비밀번호 재설정 링크를 이메일로 발송했습니다. 메일함을 확인해 주세요.",
        },
        { status: 200 }
      );
    }

    // 비밀번호 리셋 토큰 생성 (24시간 유효)
    const resetToken = await TokenService.createToken(
      email,
      "password_reset",
      24,
      user.id
    );

    // 이메일 발송
    const emailSent = await EmailService.sendPasswordResetEmail(
      email,
      resetToken
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: "이메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "비밀번호 재설정 링크를 이메일로 발송했습니다. 메일함을 확인해 주세요.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}