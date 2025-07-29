"use client";

import { LoginForm, RegisterForm, UserProfile } from "@/components/auth";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function AuthContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<"login" | "register">("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  // 로그인 성공 후 리다이렉트 처리
  const handleAuthSuccess = () => {
    router.push(returnUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-600">인증 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6 text-green-600">
              ✅ 로그인 성공!
            </h2>
            <UserProfile />

            <div className="mt-4 md:mt-6 bg-gray-50 p-3 md:p-4 rounded-lg">
              <h3 className="text-sm md:text-base font-semibold mb-2">사용자 정보:</h3>
              <ul className="space-y-1 text-xs md:text-sm">
                <li>
                  <strong>ID:</strong> {user.id}
                </li>
                <li>
                  <strong>이메일:</strong> {user.email}
                </li>
                <li>
                  <strong>이름:</strong> {user.name}
                </li>
              </ul>
            </div>

            <div className="mt-4 md:mt-6">
              <button
                onClick={handleAuthSuccess}
                className="w-full bg-blue-600 text-white py-2.5 md:py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm md:text-base"
              >
                계속하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm md:text-base text-gray-600 hover:text-gray-900 mb-4 md:mb-6 transition-colors"
        >
          <svg 
            className="w-4 h-4 mr-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </Link>
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-gray-900">
            인증
          </h1>

          {/* 탭 메뉴 */}
          <div className="flex mb-4 md:mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentView("login")}
              className={`flex-1 py-2 px-3 md:px-4 rounded-md text-sm font-medium transition-colors ${
                currentView === "login"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setCurrentView("register")}
              className={`flex-1 py-2 px-3 md:px-4 rounded-md text-sm font-medium transition-colors ${
                currentView === "register"
                  ? "bg-white text-green-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              회원가입
            </button>
          </div>

          {/* 폼 컨텐츠 */}
          {currentView === "login" ? (
            <LoginForm onSuccess={handleAuthSuccess} />
          ) : (
            <RegisterForm onSuccess={handleAuthSuccess} />
          )}
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
            <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
