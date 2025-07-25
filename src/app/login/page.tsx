"use client";

import React from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { useLogin } from "@/hooks/useLogin";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useLogin();

  const handleLogin = async (email: string, password: string) => {
    const result = await login(email, password);
    
    if (result.success) {
      // 로그인 성공 시 홈으로 리다이렉트
      router.push("/");
    } else {
      // 에러는 LoginForm 컴포넌트에서 처리
      throw new Error(result.error || "로그인에 실패했습니다.");
    }
  };

  const handleRegister = () => {
    // 회원가입 페이지로 이동
    router.push("/register");
  };

  const handleForgotPassword = () => {
    // 비밀번호 찾기 페이지로 이동
    router.push("/forgot-password");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <LoginForm
          onLogin={handleLogin}
          onRegister={handleRegister}
          onForgotPassword={handleForgotPassword}
        />
      </div>
    </div>
  );
}