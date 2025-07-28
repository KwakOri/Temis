"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Loading from "@/components/Loading";
import { Template } from "@/types/supabase-types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface UserTemplate {
  id: string | number;
  access_level: "read" | "write" | "admin";
  granted_at: string | null;
  templates: Template;
}

interface TwitterStatus {
  isConnected: boolean;
  twitterUsername: string | null;
  connectedAt: string | null;
}

const MyPageContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [twitterStatus, setTwitterStatus] = useState<TwitterStatus>({
    isConnected: false,
    twitterUsername: null,
    connectedAt: null,
  });
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchUserTemplates();
    fetchTwitterStatus();
  }, []);

  // Handle Twitter callback
  useEffect(() => {
    const twitterParam = searchParams.get("twitter");
    const oauthToken = searchParams.get("oauth_token");
    const oauthVerifier = searchParams.get("oauth_verifier");

    if (twitterParam === "callback" && oauthToken && oauthVerifier) {
      handleTwitterCallback(oauthToken, oauthVerifier);
    } else if (twitterParam === "cancelled") {
      setError("트위터 연동이 취소되었습니다.");
    } else if (twitterParam === "error") {
      setError("트위터 연동 중 오류가 발생했습니다.");
    }
  }, [searchParams]);

  const fetchUserTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/templates", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("템플릿 목록을 가져올 수 없습니다.");
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTwitterStatus = async () => {
    try {
      const response = await fetch("/api/user/twitter-status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTwitterStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Twitter status:", error);
    }
  };

  const handleTwitterConnect = async () => {
    try {
      setTwitterLoading(true);
      setError("");

      const response = await fetch("/api/auth/twitter?action=request_token", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("트위터 연동 요청에 실패했습니다.");
      }

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Store token secret temporarily in sessionStorage
        sessionStorage.setItem("twitter_token_secret", data.oauthTokenSecret);
        // Redirect to Twitter authorization
        window.location.href = data.authUrl;
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "트위터 연동 중 오류가 발생했습니다."
      );
    } finally {
      setTwitterLoading(false);
    }
  };

  const handleTwitterCallback = async (
    oauthToken: string,
    oauthVerifier: string
  ) => {
    try {
      setTwitterLoading(true);
      setError("");

      const oauthTokenSecret = sessionStorage.getItem("twitter_token_secret");
      if (!oauthTokenSecret) {
        throw new Error("토큰 정보가 누락되었습니다.");
      }

      const response = await fetch("/api/auth/twitter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          oauthToken,
          oauthVerifier,
          oauthTokenSecret,
        }),
      });

      if (!response.ok) {
        throw new Error("트위터 계정 연동에 실패했습니다.");
      }

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("트위터 계정이 성공적으로 연동되었습니다!");
        await fetchTwitterStatus();
        sessionStorage.removeItem("twitter_token_secret");

        // Clear URL parameters
        window.history.replaceState({}, "", "/my-page");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "트위터 연동 처리 중 오류가 발생했습니다."
      );
    } finally {
      setTwitterLoading(false);
    }
  };

  const handleTwitterDisconnect = async () => {
    if (!confirm("트위터 계정 연동을 해제하시겠습니까?")) {
      return;
    }

    try {
      setTwitterLoading(true);
      setError("");

      const response = await fetch("/api/auth/twitter/disconnect", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("트위터 연동 해제에 실패했습니다.");
      }

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("트위터 계정 연동이 해제되었습니다.");
        setTwitterStatus({
          isConnected: false,
          twitterUsername: null,
          connectedAt: null,
        });
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "트위터 연동 해제 중 오류가 발생했습니다."
      );
    } finally {
      setTwitterLoading(false);
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
    // TODO: 템플릿 상세 페이지로 이동 또는 템플릿 사용 페이지로 이동
    console.log("Navigate to template:", template.id);
    router.push(`/templates/${template.id}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
            <p className="mt-2 text-gray-600">
              접근 권한이 있는 템플릿 목록을 확인하고 관리하세요.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-green-800">{successMessage}</div>
              <button
                onClick={() => setSuccessMessage("")}
                className="mt-2 text-sm text-green-600 hover:text-green-800"
              >
                닫기
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">{error}</div>
              <button
                onClick={() => setError("")}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                닫기
              </button>
            </div>
          )}

          {/* Twitter Integration Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      트위터 연동
                    </h3>
                    <p className="text-sm text-gray-600">
                      {twitterStatus.isConnected
                        ? `@${twitterStatus.twitterUsername}으로 연동됨`
                        : "시간표 이미지를 트위터에 바로 공유하세요"}
                    </p>
                    {twitterStatus.isConnected && twitterStatus.connectedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        연동일:{" "}
                        {new Date(twitterStatus.connectedAt).toLocaleDateString(
                          "ko-KR"
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {twitterStatus.isConnected ? (
                    <button
                      onClick={handleTwitterDisconnect}
                      disabled={twitterLoading}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {twitterLoading ? "처리 중..." : "연동 해제"}
                    </button>
                  ) : (
                    <button
                      onClick={handleTwitterConnect}
                      disabled={twitterLoading}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {twitterLoading ? "연결 중..." : "트위터 연동"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <Loading />
          ) : (
            <>
              {/* Stats */}
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-8 w-8 text-indigo-600"
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
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        접근 가능한 템플릿
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {templates.length}개
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Templates Grid */}
              {templates.length === 0 ? (
                <div className="text-center py-20">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    템플릿이 없습니다
                  </h3>
                  <p className="mt-2 text-gray-500">
                    아직 접근 권한이 부여된 템플릿이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {templates.map((template) => (
                    <div
                      key={`${template.templates.id}-${template.id}`}
                      onClick={() => handleTemplateClick(template.templates)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer brightness-100 hover:brightness-75 transition-all"
                    >
                      {/* Template Thumbnail */}
                      <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                        {template.templates.thumbnail_url ? (
                          <img
                            src={template.templates.thumbnail_url}
                            alt={template.templates.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              className="h-12 w-12 text-gray-400"
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
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {template.templates.name}
                          </h3>
                          <span
                            className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getAccessLevelColor(
                              template.access_level
                            )}`}
                          >
                            {getAccessLevelText(template.access_level)}
                          </span>
                        </div>

                        {template.templates.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {template.templates.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                template.templates.is_public
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {template.templates.is_public ? "공개" : "비공개"}
                            </span>
                          </div>
                          {template.granted_at && (
                            <span>
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
