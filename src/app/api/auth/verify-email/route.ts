import { signJWT } from "@/lib/auth";
import { EmailService } from "@/lib/email";
import { UserService } from "@/lib/supabase";
import { TokenService } from "@/lib/token";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // 토큰 검증
    if (!token) {
      return NextResponse.json(
        { error: "인증 토큰이 필요합니다." },
        { status: 400 }
      );
    }

    // 데이터베이스에서 토큰 검증
    const tokenValidation = await TokenService.validateToken(
      token,
      "email_verification"
    );

    if (!tokenValidation.isValid || !tokenValidation.tokenData) {
      return NextResponse.json(
        { error: tokenValidation.error || "유효하지 않은 인증 토큰입니다." },
        { status: 400 }
      );
    }

    const { user_id: userId, email } = tokenValidation.tokenData;

    if (!userId) {
      return NextResponse.json(
        { error: "토큰에 사용자 정보가 없습니다." },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await UserService.getById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 인증된 사용자인지 확인
    if (user.role === "user") {
      return NextResponse.json(
        { error: "이미 인증 완료된 계정입니다." },
        { status: 400 }
      );
    }

    // unauthorized에서 user로 role 변경
    const updatedUser = await UserService.updateRole(userId, "user");
    if (!updatedUser) {
      return NextResponse.json(
        { error: "계정 인증 처리에 실패했습니다." },
        { status: 500 }
      );
    }

    // JWT 토큰 생성
    const jwtToken = await signJWT({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });

    // 인증 토큰 사용 처리
    await TokenService.markTokenAsUsed(token);

    // 환영 이메일 발송
    try {
      await EmailService.sendWelcomeEmail(updatedUser.email, updatedUser.name);
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
      // 이메일 실패는 인증을 실패시키지 않음
    }

    // 응답 생성
    const response = NextResponse.json(
      {
        message:
          "이메일 인증이 완료되었습니다. 회원가입이 성공적으로 처리되었습니다.",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
      },
      { status: 200 }
    );

    // HTTP-Only 쿠키로 토큰 설정
    response.cookies.set("auth-token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "이메일 인증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
