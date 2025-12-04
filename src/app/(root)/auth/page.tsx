"use client";

import { LoginForm } from "@/components/auth";
import { PublicRegisterForm } from "@/components/auth/PublicRegisterForm";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AuthContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const [isSignupMode, setIsSignupMode] = useState(false);

  // 이미 로그인된 사용자는 returnUrl로 리다이렉트 (히스토리 대체)
  useEffect(() => {
    if (!loading && user) {
      router.replace(returnUrl);
    }
  }, [user, loading, router, returnUrl]);

  // 로그인 성공 후 리다이렉트 처리 (히스토리 대체)
  const handleAuthSuccess = () => {
    router.replace(returnUrl);
  };

  // 회원가입 모드 전환
  const toggleSignupMode = () => {
    setIsSignupMode(!isSignupMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-600">
            인증 상태 확인 중...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm md:text-base text-slate-600 hover:text-[#1e3a8a] mb-4 md:mb-6 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          뒤로가기
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20">
          {/* 헤더 */}
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-[#1e3a8a]">
              {isSignupMode ? (
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isSignupMode ? "새 계정 만들기" : "계정 로그인"}
            </h2>
            <p className="text-slate-600">
              {isSignupMode
                ? "Temis와 함께 시간표를 관리해보세요"
                : "다시 만나서 반갑습니다"}
            </p>
          </div>

          {/* 폼 */}
          {isSignupMode ? (
            <PublicRegisterForm
              onSuccess={() => {}}
              onBack={toggleSignupMode}
            />
          ) : (
            <>
              <LoginForm onSuccess={handleAuthSuccess} />

              {/* 회원가입 버튼 */}
              <div className="mt-8 text-center relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500">또는</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600 mb-4">
                  아직 계정이 없으신가요?
                </p>
                <button
                  onClick={toggleSignupMode}
                  className="w-full bg-[#1e3a8a] text-white py-3 px-4 rounded-lg hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                >
                  회원가입하기
                </button>
              </div>
            </>
          )}
        </div>

        {/* 하단 정보 */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">
            © 2024 Temis. 모든 권리 보유.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-600">
              로딩 중...
            </p>
          </div>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
