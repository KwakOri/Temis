import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/lib/token";
import { UserService } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // 입력 검증
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "비밀번호는 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 비밀번호 강도 검증
    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 토큰 유효성 검증
    const tokenValidation = await TokenService.validateToken(
      token,
      "password_reset"
    );

    if (!tokenValidation.isValid || !tokenValidation.tokenData) {
      return NextResponse.json(
        { error: tokenValidation.error || "유효하지 않은 토큰입니다." },
        { status: 400 }
      );
    }

    const { email, user_id } = tokenValidation.tokenData;

    // 사용자 확인
    const user = await UserService.findByEmail(email);
    if (!user || user.id !== user_id) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 비밀번호 해시화
    const hashedPassword = await hashPassword(password);

    // 비밀번호 업데이트
    await UserService.update(user.id, {
      password: hashedPassword,
    });

    // 토큰 사용 처리
    await TokenService.markTokenAsUsed(token);

    return NextResponse.json(
      {
        message: "비밀번호가 성공적으로 변경되었습니다.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "토큰이 필요합니다." },
        { status: 400 }
      );
    }

    // 토큰 유효성 검증만 수행
    const tokenValidation = await TokenService.validateToken(
      token,
      "password_reset"
    );

    if (!tokenValidation.isValid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: tokenValidation.error || "유효하지 않은 토큰입니다." 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        email: tokenValidation.tokenData?.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}