"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import { useTemplateHubTemplates } from "@/hooks/query/useTemplateHub";
import { LayoutList } from "lucide-react";

export function TemplateHubClient() {
  const templatesQuery = useTemplateHubTemplates();

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminTabHeader
        description="Legacy와 Studio 템플릿을 한 곳에서 조회하고 판매를 운영하세요"
        icon={LayoutList}
        title="템플릿 통합 관리 (Beta)"
      />

      <div className="bg-white shadow-sm rounded-lg p-6">
        {templatesQuery.isLoading ? (
          <p className="text-sm text-gray-500">템플릿 목록을 불러오는 중...</p>
        ) : templatesQuery.isError ? (
          <p className="text-sm text-red-700">
            {templatesQuery.error instanceof Error
              ? templatesQuery.error.message
              : "템플릿 목록을 불러오지 못했습니다."}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            총 {templatesQuery.data?.pagination.total ?? 0}개
          </p>
        )}
      </div>
    </div>
  );
}
