"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccessDeniedPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setTemplateId(params.get("templateId"));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              접근 권한이 없습니다
            </h1>
            <p className="text-gray-600 mb-6">
              이 템플릿에 접근할 권한이 없습니다. 관리자에게 문의하여 권한을
              요청하세요.
            </p>
            {templateId && (
              <div className="text-xs text-gray-500 mb-4">
                템플릿 ID: {templateId}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => router.push("/my-page")}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                내 페이지로 돌아가기
              </button>

              <button
                onClick={() => router.back()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                이전 페이지로
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
