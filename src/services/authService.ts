import {
  RegisterData,
  RegisterResponse,
  ResetPasswordData,
  ResetPasswordResponse,
  ResetPasswordTokenValidateResponse,
  SignupTokenValidateResponse,
  VerifyEmailData,
  VerifyEmailResponse,
} from "@/types/auth";
import { authRateLimiter } from "@/lib/rateLimiter";

export class AuthService {
  // 회원가입 토큰 유효성 검증
  static async validateSignupToken(
    token: string
  ): Promise<SignupTokenValidateResponse> {
    const response = await fetch(`/api/auth/signup/validate?token=${token}`, {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "토큰 검증에 실패했습니다.");
    }

    return data;
  }

  // 회원가입
  static async register(registerData: RegisterData): Promise<RegisterResponse> {
    // Rate limiting 체크 (이메일 기반)
    const rateLimitKey = `register:${registerData.email}`;
    const rateLimitResult = authRateLimiter.attempt(rateLimitKey);

    if (!rateLimitResult.allowed) {
      throw new Error(
        `요청이 너무 많습니다. ${rateLimitResult.retryAfter}초 후에 다시 시도해주세요.`
      );
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "회원가입에 실패했습니다.");
    }

    return data;
  }

  // 이메일 인증
  static async verifyEmail(
    verifyData: VerifyEmailData
  ): Promise<VerifyEmailResponse> {
    // Rate limiting 체크
    const rateLimitKey = `verify-email:${verifyData.token}`;
    const rateLimitResult = authRateLimiter.attempt(rateLimitKey);

    if (!rateLimitResult.allowed) {
      throw new Error(
        `요청이 너무 많습니다. ${rateLimitResult.retryAfter}초 후에 다시 시도해주세요.`
      );
    }

    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verifyData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "인증에 실패했습니다.");
    }

    return data;
  }

  // 비밀번호 재설정 토큰 유효성 검증
  static async validateResetPasswordToken(
    token: string
  ): Promise<ResetPasswordTokenValidateResponse> {
    const response = await fetch(`/api/auth/reset-password?token=${token}`, {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "토큰 검증에 실패했습니다.");
    }

    return data;
  }

  // 비밀번호 재설정
  static async resetPassword(
    resetData: ResetPasswordData
  ): Promise<ResetPasswordResponse> {
    // Rate limiting 체크
    const rateLimitKey = `reset-password:${resetData.token}`;
    const rateLimitResult = authRateLimiter.attempt(rateLimitKey);

    if (!rateLimitResult.allowed) {
      throw new Error(
        `요청이 너무 많습니다. ${rateLimitResult.retryAfter}초 후에 다시 시도해주세요.`
      );
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resetData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "비밀번호 변경에 실패했습니다.");
    }

    return data;
  }
}
