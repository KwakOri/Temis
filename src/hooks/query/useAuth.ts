import { queryKeys } from "@/lib/queryKeys";
import { AuthService } from "@/services/authService";
import { RegisterData, ResetPasswordData, VerifyEmailData } from "@/types/auth";
import { useMutation, useQuery } from "@tanstack/react-query";

// 회원가입 토큰 유효성 검증
export const useValidateSignupToken = (token: string) => {
  return useQuery({
    queryKey: queryKeys.auth.signupTokenValidate(token),
    queryFn: () => AuthService.validateSignupToken(token),
    enabled: !!token,
    retry: false, // 토큰 검증 실패 시 재시도하지 않음
    staleTime: Infinity, // 토큰 검증 결과는 변하지 않으므로 무한 캐시
  });
};

// 회원가입
export const useRegister = () => {
  return useMutation({
    mutationFn: (registerData: RegisterData) =>
      AuthService.register(registerData),
  });
};

// 이메일 인증
export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (verifyData: VerifyEmailData) =>
      AuthService.verifyEmail(verifyData),
  });
};

// 비밀번호 재설정 토큰 유효성 검증
export const useValidateResetPasswordToken = (token: string) => {
  return useQuery({
    queryKey: queryKeys.auth.resetPasswordTokenValidate(token),
    queryFn: () => AuthService.validateResetPasswordToken(token),
    enabled: !!token,
    retry: false, // 토큰 검증 실패 시 재시도하지 않음
    staleTime: Infinity, // 토큰 검증 결과는 변하지 않으므로 무한 캐시
  });
};

// 비밀번호 재설정
export const useResetPassword = () => {
  return useMutation({
    mutationFn: (resetData: ResetPasswordData) =>
      AuthService.resetPassword(resetData),
  });
};
