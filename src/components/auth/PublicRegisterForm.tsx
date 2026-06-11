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

  const passwordChecks = [
    formData.password.length >= 8,
    /[A-Z]/.test(formData.password),
    /[a-z]/.test(formData.password),
    /[0-9]/.test(formData.password),
    /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  ];
  const isPasswordValid = passwordChecks.every(Boolean);
  const hasConfirmPassword = formData.confirmPassword.length > 0;
  const isPasswordMismatch =
    hasConfirmPassword && formData.password !== formData.confirmPassword;

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

    if (!isPasswordValid) {
      setError("비밀번호 조건을 확인해주세요.");
      setIsLoading(false);
      return;
    }

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
    } catch {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 성공 상태 표시
  if (isSuccess) {
    return (
      <div className={`max-w-lg mx-auto ${className}`}>
        <div className="overflow-hidden rounded-2xl border border-tertiary bg-timetable-form-bg shadow-xl">
          <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
          <div className="p-7 md:p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5 bg-primary/10 border border-primary/20">
              <svg
                className="w-8 h-8 text-primary"
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
            <h3 className="text-2xl font-bold text-dark-gray mb-3">
              회원가입 신청 완료
            </h3>
            <p className="text-dark-gray/70 leading-relaxed">
              입력하신 이메일로 인증 링크를 보냈습니다.
              <br />
              메일 인증까지 완료하면 계정을 사용할 수 있어요.
            </p>

            <div className="my-6 border-y border-tertiary/70 divide-y divide-tertiary/70 text-left">
              <div className="flex gap-3 py-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  1
                </span>
                <p className="text-sm text-dark-gray/70">
                  메일함에서 Temis 인증 메일을 확인해 주세요.
                </p>
              </div>
              <div className="flex gap-3 py-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  2
                </span>
                <p className="text-sm text-dark-gray/70">
                  인증 링크를 누르면 가입이 최종 완료됩니다.
                </p>
              </div>
              <div className="flex gap-3 py-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  3
                </span>
                <p className="text-sm text-dark-gray/70">
                  메일이 보이지 않으면 스팸함도 함께 확인해 주세요.
                </p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
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
            className="block text-sm font-semibold text-dark-gray mb-2"
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
            className="w-full px-4 py-3 border border-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-timetable-input-bg hover:bg-white hover:border-primary/30 text-dark-gray placeholder-dark-gray/40"
            placeholder="테미스"
            disabled={isLoading}
          />
        </div>

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
          <div
            className={`mt-2 rounded-lg border p-3 transition-colors ${
              isPasswordValid
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <p
              className={`text-xs flex items-center ${
                isPasswordValid ? "text-green-700" : "text-red-700"
              }`}
            >
              <svg
                className={`w-3 h-3 mr-1 ${
                  isPasswordValid ? "text-green-600" : "text-red-600"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {isPasswordValid ? (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              {isPasswordValid
                ? "비밀번호 조건을 충족했습니다."
                : "최소 8자, 대소문자, 숫자, 특수문자 포함"}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-dark-gray mb-2"
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
            className="w-full px-4 py-3 border border-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-timetable-input-bg hover:bg-white hover:border-primary/30 text-dark-gray placeholder-dark-gray/40"
            placeholder="비밀번호를 다시 입력하세요"
            disabled={isLoading}
          />
          {hasConfirmPassword && (
            <p
              className={`mt-2 text-xs ${
                isPasswordMismatch ? "text-red-700" : "text-green-700"
              }`}
            >
              {isPasswordMismatch
                ? "비밀번호가 일치하지 않습니다."
                : "비밀번호가 일치합니다."}
            </p>
          )}
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
            className="text-sm text-dark-gray/70 hover:text-primary underline decoration-2 underline-offset-4 transition-colors font-medium"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </form>
    </div>
  );
}
