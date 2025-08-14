import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { UserService } from "@/lib/supabase";
import { TokenService } from "@/lib/token";
import { EmailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
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

    // 이미 가입된 사용자인지 확인
    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 400 }
      );
    }

    // 기존 유효한 초대 토큰이 있는지 확인
    const existingTokens = await TokenService.getUserTokens(email, "signup_invite");
    const validToken = existingTokens.find(
      (token) => !token.used && new Date(token.expires_at) > new Date()
    );

    if (validToken) {
      return NextResponse.json(
        { error: "이미 초대 이메일이 발송된 상태입니다." },
        { status: 400 }
      );
    }

    // 회원가입 초대 토큰 생성 (72시간 유효)
    const inviteToken = await TokenService.createToken(
      email,
      "signup_invite",
      72
    );

    // 초대 이메일 발송
    console.log("Sending invite email to:", email, "with token:", inviteToken.substring(0, 8) + "...");
    
    try {
      const emailSent = await EmailService.sendSignupInviteEmail(
        email,
        inviteToken
      );

      console.log("Email sent result:", emailSent);

      if (!emailSent) {
        return NextResponse.json(
          { error: "이메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
          { status: 500 }
        );
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      return NextResponse.json(
        { error: "이메일 발송 중 오류가 발생했습니다: " + (emailError instanceof Error ? emailError.message : String(emailError)) },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "회원가입 초대 이메일을 성공적으로 발송했습니다.",
        invitedEmail: email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Invite user error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}