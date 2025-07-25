"use client";

import React, { useState } from "react";

interface LoginFormProps {
  onLogin?: (email: string, password: string) => void;
  onRegister?: () => void;
  onForgotPassword?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onRegister,
  onForgotPassword,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }

    if (!email.includes("@")) {
      setError("올바른 이메일 형식을 입력하세요.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);
    try {
      await onLogin?.(email, password);
    } catch (err) {
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-primary">로그인</h1>
        <p className="text-gray-600 mt-2">계정에 로그인하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="example@email.com"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="비밀번호를 입력하세요"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <button
          onClick={onForgotPassword}
          className="w-full text-primary hover:text-primary-dark text-sm font-medium underline"
        >
          비밀번호를 잊으셨나요?
        </button>
        
        <div className="text-center text-gray-600">
          <span className="text-sm">계정이 없으신가요? </span>
          <button
            onClick={onRegister}
            className="text-primary hover:text-primary-dark font-medium underline"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;