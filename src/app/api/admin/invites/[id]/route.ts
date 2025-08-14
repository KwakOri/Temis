import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { UserService } from "@/lib/supabase";
import { TokenService } from "@/lib/token";

// 특정 초대 토큰 삭제 (취소)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 관리자 권한 확인
    const authHeader = request.headers.get("authorization");
    const token = request.cookies.get("auth-token")?.value || authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
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

    // 토큰 삭제
    const success = await TokenService.deleteToken(id);

    if (success) {
      return NextResponse.json(
        { message: "초대가 성공적으로 취소되었습니다." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "초대 취소에 실패했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Delete invite error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}