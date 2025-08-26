import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/lib/token";

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
      "signup_invite"
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