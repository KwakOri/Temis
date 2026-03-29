"use client";

import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState } from "react";
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
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered-email");
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberEmail(true);
    }
  }, []);

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
        if (rememberEmail) {
          localStorage.setItem("remembered-email", formData.email);
        } else {
          localStorage.removeItem("remembered-email");
        }
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-dark-gray mb-2"
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
            className="w-full px-4 py-3 border border-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-timetable-input-bg hover:bg-white hover:border-primary/30 text-dark-gray placeholder-dark-gray/40"
            placeholder="example@email.com"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-dark-gray mb-2"
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
            className="w-full px-4 py-3 border border-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-timetable-input-bg hover:bg-white hover:border-primary/30 text-dark-gray placeholder-dark-gray/40"
            placeholder="비밀번호를 입력하세요"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-email"
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-tertiary rounded"
              disabled={isLoading}
            />
            <label
              htmlFor="remember-email"
              className="ml-2 block text-sm text-dark-gray/70"
            >
              이메일 기억하기
            </label>
          </div>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            disabled={isLoading}
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        {error && (
          <div className="text-red-700 text-sm bg-red-50 border border-red-200 p-4 rounded-xl flex items-start">
            <svg
              className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white py-3.5 px-4 rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              로그인 중...
            </span>
          ) : (
            "로그인"
          )}
        </button>
      </form>
    </div>
  );
}
