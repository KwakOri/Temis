import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { EmailService } from "@/lib/email";
import { UserService } from "@/lib/supabase";
import { TokenService } from "@/lib/token";
import { NextRequest, NextResponse } from "next/server";

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

    // 인증되지 않은 상태로 사용자 생성 (role: 'unauthorized')
    const newUser = await UserService.create({
      email,
      password: hashedPassword,
      name,
      role: "unauthorized", // 인증 전까지는 unauthorized
      twitter_access_token: null,
      twitter_access_token_secret: null,
      twitter_user_id: null,
      twitter_username: null,
      twitter_connected_at: null,
    });

    // 이메일 인증 토큰 생성 (사용자 ID와 연결)
    const verificationToken = await TokenService.createToken(
      email,
      "email_verification",
      24, // 24시간 유효
      newUser.id
    );

    // 인증 이메일 발송
    const emailSent = await EmailService.sendEmailVerificationEmail(
      email,
      name,
      verificationToken
    );

    if (!emailSent) {
      // 이메일 발송 실패 시 생성된 사용자 삭제
      await UserService.deleteById(newUser.id);
      return NextResponse.json(
        { error: "인증 이메일 발송에 실패했습니다. 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "회원가입 신청이 완료되었습니다. 이메일을 확인하여 인증을 완료해 주세요.",
        email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Public registration error:", error);
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}