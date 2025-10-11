"use client";

import BackButton from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePublicTemplates,
  useUserTemplateAccess,
} from "@/hooks/query/useShop";
import { SortOrder } from "@/types/shop";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ShopPage() {
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showOnlyUnpurchased, setShowOnlyUnpurchased] = useState(false);

  // React Query hooks
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
  } = usePublicTemplates(sortOrder);
  const { data: accessibleTemplateIds = [], isLoading: accessLoading } =
    useUserTemplateAccess(user?.id);

  const loading =
    templatesLoading || (showOnlyUnpurchased && user && accessLoading);

  const filteredTemplates = useMemo(() => {
    if (showOnlyUnpurchased && user) {
      return templates.filter(
        (template) => !accessibleTemplateIds.includes(template.template_id!)
      );
    }
    return templates;
  }, [templates, showOnlyUnpurchased, user, accessibleTemplateIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (templatesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              데이터를 불러올 수 없습니다
            </h3>
            <p className="text-gray-500">
              {templatesError instanceof Error
                ? templatesError.message
                : "알 수 없는 오류가 발생했습니다."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackButton className="mb-4" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20 mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-[#1e3a8a]">
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
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5H21"
                />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              템플릿 상점
            </h1>
            <p className="text-slate-600">
              다양한 시간표 템플릿을 둘러보고 구매하세요
            </p>
          </div>


          {/* 컨텐츠 영역 */}
          <>
              {/* 정렬 및 필터 컨트롤 */}
              <div className="mb-6 flex flex-wrap gap-4 items-center justify-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-700">
                    정렬:
                  </span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  >
                    <option value="newest">최신 순</option>
                    <option value="oldest">오래된 순</option>
                  </select>
                </div>

                {user && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-700">
                      구매하지 않은 템플릿만:
                    </span>
                    <button
                      onClick={() =>
                        setShowOnlyUnpurchased(!showOnlyUnpurchased)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 ${
                        showOnlyUnpurchased ? "bg-[#1e3a8a]" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                          showOnlyUnpurchased
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <Link
                    key={template.id}
                    href={`/shop/${template.template_id}`}
                    className="group block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-[#1e3a8a]/20"
                  >
                    <div className="aspect-video bg-slate-100 rounded-t-2xl overflow-hidden">
                      <Image
                        src={template.templates.thumbnail_url || `/thumbnail/${template.template_id}.png`}
                        alt={template.templates.name || "템플릿"}
                        width={400}
                        height={225}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML =
                              '<div class="w-full h-full flex items-center justify-center text-slate-400">썸네일 이미지 없음</div>';
                          }
                        }}
                      />
                    </div>

                    <div className="p-6">
                      <h3 className="font-semibold text-lg group-hover:text-[#1e3a8a] transition-colors mb-2">
                        {template.templates.name}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                        {template.templates.description}
                      </p>
                      {template.template_plans && template.template_plans.length > 0 && (
                        <div className="flex items-center gap-3 mb-4">
                          {template.template_plans.find((p) => p.plan === "lite") && (
                            <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                              <div className="text-xs text-slate-500 mb-1">LITE</div>
                              <div className="text-sm font-bold text-slate-700">
                                ₩{template.template_plans.find((p) => p.plan === "lite")!.price!.toLocaleString()}
                              </div>
                            </div>
                          )}
                          {template.template_plans.find((p) => p.plan === "pro") && (
                            <div className="flex-1 bg-indigo-50 rounded-lg px-3 py-2">
                              <div className="text-xs text-indigo-600 mb-1">PRO</div>
                              <div className="text-sm font-bold text-indigo-700">
                                ₩{template.template_plans.find((p) => p.plan === "pro")!.price!.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center text-[#1e3a8a] text-sm font-medium">
                        <span>자세히 보기</span>
                        <svg
                          className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-slate-100">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-lg">
                    {showOnlyUnpurchased
                      ? "구매하지 않은 템플릿이 없습니다."
                      : "현재 판매 중인 템플릿이 없습니다."}
                  </p>
                </div>
              )}
            </>
        </div>
      </div>
    </div>
  );
}
