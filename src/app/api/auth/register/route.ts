import { hashPassword, signJWT, validatePasswordStrength } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 입력 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "이메일, 비밀번호, 이름을 모두 입력해주세요." },
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
    });

    // JWT 토큰 생성
    const token = await signJWT({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

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
    response.cookies.set("auth-token", token, {
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
