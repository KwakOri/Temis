import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { isAuthenticated, isAdmin } from "@/lib/auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authResult = await isAuthenticated(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const adminResult = await isAdmin(request);
    if (!adminResult.isAdmin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

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

    // Supabase에 사용자 저장 (관리자가 생성)
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

    // 응답 생성 (관리자 전용이므로 JWT 토큰 생성하지 않음)
    return NextResponse.json(
      {
        message: "사용자가 성공적으로 생성되었습니다.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          created_at: newUser.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin user creation error:", error);
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}