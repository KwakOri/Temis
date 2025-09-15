// 회원가입 관련 타입
export interface SignupTokenValidateResponse {
  valid: boolean;
  email?: string;
  error?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  token: string;
}

export interface RegisterResponse {
  success: boolean;
  error?: string;
}

// 이메일 인증 관련 타입
export interface VerifyEmailData {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  error?: string;
}

// 비밀번호 재설정 관련 타입
export interface ResetPasswordTokenValidateResponse {
  valid: boolean;
  email?: string;
  error?: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  error?: string;
}
