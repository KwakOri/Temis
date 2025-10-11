"use client";

import { useAuth } from "@/contexts/AuthContext";
import React, { useState } from "react";

interface PublicRegisterFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
  className?: string;
}

export function PublicRegisterForm({
  onSuccess,
  onBack,
  className = "",
}: PublicRegisterFormProps) {
  const { registerPublic } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await registerPublic(
        formData.email,
        formData.password,
        formData.name
      );

      if (result.success) {
        setIsSuccess(true);
        onSuccess?.();
      } else {
        setError(result.error || "회원가입에 실패했습니다.");
      }
    } catch (error) {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 성공 상태 표시
  if (isSuccess) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <div className="text-center p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1e3a8a] rounded-full mb-6 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">
            회원가입 신청 완료! 🎉
          </h3>
          <p className="text-slate-700 mb-4 leading-relaxed">
            입력하신 이메일 주소로 <strong>인증 링크</strong>를 발송했습니다.
          </p>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/50">
            <p className="text-sm text-slate-600 leading-relaxed">
              📧 이메일을 확인하고 인증 링크를 클릭하여
              <br />
              <strong>회원가입을 완료</strong>해 주세요.
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-[#1e3a8a] hover:text-[#1e40af] font-medium transition-colors underline decoration-2 underline-offset-4"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            닉네임
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-900 placeholder-slate-400"
            placeholder="테미스"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-slate-700 mb-2"
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-900 placeholder-slate-400"
            placeholder="example@email.com"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-slate-700 mb-2"
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-900 placeholder-slate-400"
            placeholder="비밀번호를 입력하세요"
            disabled={isLoading}
          />
          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700 flex items-center">
              <svg
                className="w-3 h-3 mr-1 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              최소 8자, 대소문자, 숫자, 특수문자 포함
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-900 placeholder-slate-400"
            placeholder="비밀번호를 다시 입력하세요"
            disabled={isLoading}
          />
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
          className="w-full bg-[#1e3a8a] text-white py-3.5 px-4 rounded-xl hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg font-semibold"
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
              가입 중...
            </span>
          ) : (
            "회원가입"
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-slate-600 hover:text-[#1e3a8a] underline decoration-2 underline-offset-4 transition-colors font-medium"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </form>
    </div>
  );
}
