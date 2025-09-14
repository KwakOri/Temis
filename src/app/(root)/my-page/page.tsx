"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import BackButton from "@/components/BackButton";
import Loading from "@/components/Loading";

import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { useUserTemplates } from "@/hooks/query/useUserTemplates";
import { Tables } from "@/types/supabase";
import { Suspense, useState } from "react";

type Template = Tables<"templates">;

const MyPageContent = () => {
  const router = useRouter();
  const { logout: authLogout } = useAuth();
  const { data, isLoading, error: queryError } = useUserTemplates();

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);

  const templates = data?.templates || [];
  const loading = isLoading;

  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) {
      return;
    }

    try {
      setLogoutLoading(true);
      setError("");

      // AuthContext의 logout 함수를 사용하여 쿠키 제거
      await authLogout();

      // 약간의 지연 후 리다이렉트 (사용자가 메시지를 볼 수 있도록)
    } catch (error) {
      console.error("Logout error:", error);

      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      const authKeys = [
        "auth-token",
        "token",
        "user",
        "access_token",
        "jwt_token",
      ];
      authKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      setError("로그아웃 처리 중 오류가 발생했지만 로그아웃되었습니다.");

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } finally {
      setLogoutLoading(false);
    }
  };

  const getAccessLevelText = (level: string) => {
    switch (level) {
      case "admin":
        return "관리자";
      case "write":
        return "편집";
      case "read":
        return "읽기";
      default:
        return level;
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "write":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "read":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleTemplateClick = (template: Template) => {
    router.push(`/time-table/${template.id}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  마이페이지
                </h1>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
                  접근 권한이 있는 템플릿 목록을 확인하고 관리하세요.
                </p>
              </div>
              <div className="flex justify-center md:justify-start gap-2">
                <BackButton />
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="w-full md:w-auto px-4 py-2 bg-[#1e3a8a] text-white rounded-md hover:bg-[#1e40af] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {logoutLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      로그아웃 중...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      로그아웃
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 md:mb-6 bg-green-50 border border-green-200 rounded-md p-3 md:p-4">
              <div className="text-sm md:text-base text-green-800">
                {successMessage}
              </div>
              <button
                onClick={() => setSuccessMessage("")}
                className="mt-2 text-xs md:text-sm text-green-600 hover:text-green-800"
              >
                닫기
              </button>
            </div>
          )}

          {/* Error Message */}
          {(error || queryError) && (
            <div className="mb-4 md:mb-6 bg-red-50 border border-red-200 rounded-md p-3 md:p-4">
              <div className="text-sm md:text-base text-red-800">
                {error ||
                  (queryError instanceof Error
                    ? queryError.message
                    : "오류가 발생했습니다.")}
              </div>
              <button
                onClick={() => setError("")}
                className="mt-2 text-xs md:text-sm text-red-600 hover:text-red-800"
              >
                닫기
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <Loading />
          ) : (
            <>
              {/* Stats */}
              <div className="mb-6 md:mb-8">
                <div className="bg-white rounded-lg shadow p-4 md:p-6">
                  <div className="flex items-center justify-center md:justify-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 md:h-8 md:w-8 text-[#1e3a8a]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 md:ml-4 text-center md:text-left">
                      <p className="text-xs md:text-sm font-medium text-gray-500">
                        접근 가능한 템플릿
                      </p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900">
                        {templates.length}개
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Templates Grid */}
              {templates.length === 0 ? (
                <div className="text-center py-12 md:py-20">
                  <svg
                    className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <h3 className="mt-3 md:mt-4 text-base md:text-lg font-medium text-gray-900">
                    템플릿이 없습니다
                  </h3>
                  <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-500 px-4">
                    아직 접근 권한이 부여된 템플릿이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {templates.map((template) => (
                    <div
                      key={`${template.templates.id}-${template.id}`}
                      onClick={() => handleTemplateClick(template.templates)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer brightness-100 hover:brightness-75"
                    >
                      {/* Template Thumbnail */}
                      <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                        {template.templates.id ? (
                          <img
                            src={`/thumbnail/${template.templates.id}.png`}
                            alt={template.templates.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              className="h-8 w-8 md:h-12 md:w-12 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Template Info */}
                      <div className="p-3 md:p-4">
                        <div className="flex items-start justify-between mb-1 md:mb-2">
                          <h3 className="text-sm md:text-lg font-semibold text-gray-900 truncate">
                            {template.templates.name}
                          </h3>
                          <span
                            className={`ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full border ${getAccessLevelColor(
                              template.access_level
                            )}`}
                          >
                            {getAccessLevelText(template.access_level)}
                          </span>
                        </div>

                        {template.templates.description && (
                          <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 line-clamp-2">
                            {template.templates.description}
                          </p>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <span
                              className={`inline-flex px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                                template.templates.is_public
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {template.templates.is_public ? "공개" : "비공개"}
                            </span>
                          </div>
                          {template.granted_at && (
                            <span className="text-xs">
                              권한 부여:{" "}
                              {new Date(template.granted_at).toLocaleDateString(
                                "ko-KR"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

const MyPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <MyPageContent />
    </Suspense>
  );
};

export default MyPage;
