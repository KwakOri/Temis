import { hashPassword, signJWT, validatePasswordStrength } from "@/lib/auth";
import { EmailService } from "@/lib/email";
import { UserService } from "@/lib/supabase";
import { TokenService } from "@/lib/token";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, token } = body;

    // 입력 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "이메일, 비밀번호, 이름을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 토큰 검증 (초대 기반 회원가입)
    if (!token) {
      return NextResponse.json(
        { error: "유효한 초대 토큰이 필요합니다." },
        { status: 400 }
      );
    }

    // 초대 토큰 유효성 검증
    const tokenValidation = await TokenService.validateToken(
      token,
      "signup_invite"
    );
    if (!tokenValidation.isValid || !tokenValidation.tokenData) {
      return NextResponse.json(
        { error: tokenValidation.error || "유효하지 않은 초대 토큰입니다." },
        { status: 400 }
      );
    }

    // 토큰의 이메일과 요청 이메일이 일치하는지 확인
    if (tokenValidation.tokenData.email !== email) {
      return NextResponse.json(
        { error: "초대된 이메일과 입력한 이메일이 일치하지 않습니다." },
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

    // 비밀번호 강도 검증
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: "비밀번호가 요구사항을 충족하지 않습니다.",
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // 이미 존재하는 사용자 확인
    const emailExists = await UserService.emailExists(email);
    if (emailExists) {
      return NextResponse.json(
        { error: "이미 존재하는 이메일입니다." },
        { status: 409 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);

    // Supabase에 사용자 저장
    const newUser = await UserService.create({
      email,
      password: hashedPassword,
      name,
      twitter_access_token: null,
      twitter_access_token_secret: null,
      twitter_user_id: null,
      twitter_username: null,
      twitter_connected_at: null,
    });

    // JWT 토큰 생성
    const jwtToken = await signJWT({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    // 초대 토큰 사용 처리
    await TokenService.markTokenAsUsed(token);

    // 환영 이메일 발송
    try {
      await EmailService.sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
      // 이메일 실패는 회원가입을 실패시키지 않음
    }

    // 응답 생성
    const response = NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      { status: 201 }
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
