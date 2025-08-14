"use client";

import { useAuth } from "@/contexts/AuthContext";
import React, { useState } from "react";
import ForgotPasswordForm from "./ForgotPasswordForm";

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function LoginForm({ onSuccess, className = "" }: LoginFormProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 입력 시 에러 메시지 초기화
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || "로그인에 실패했습니다.");
      }
    } catch (error) {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <ForgotPasswordForm
          onSuccess={() => {
            // 비밀번호 재설정 이메일 발송 후 로그인 폼으로 돌아가기
            setTimeout(() => setShowForgotPassword(false), 3000);
          }}
          onBack={() => setShowForgotPassword(false)}
        />
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="이메일을 입력하세요"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="비밀번호를 입력하세요"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-indigo-600 hover:text-indigo-500"
            disabled={isLoading}
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
