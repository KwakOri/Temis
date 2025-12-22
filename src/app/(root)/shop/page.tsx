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
      <div className="min-h-screen py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-dark-gray/70">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (templatesError) {
    return (
      <div className="min-h-screen py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-dark-gray mb-2">
              데이터를 불러올 수 없습니다
            </h3>
            <p className="text-dark-gray/60">
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
    <div className="min-h-screen py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackButton className="mb-4" />
        </div>

        {/* Custom Order 링크 배너 */}
        <Link
          href="/custom-order"
          className="block mb-6 bg-gradient-to-r from-primary to-secondary rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
        >
          <div className="p-6 md:p-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                  맞춤형 시간표 제작
                </h3>
                <p className="text-white/90 text-sm md:text-base">
                  나만의 독특한 디자인으로 시간표를 만들어보세요
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <svg
                className="w-6 h-6 md:w-8 md:h-8 text-white transform group-hover:translate-x-1 transition-transform"
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

        <div className="bg-timetable-form-bg rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-tertiary mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-primary">
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
            <h1 className="text-2xl md:text-3xl font-bold text-dark-gray mb-2">
              템플릿 상점
            </h1>
            <p className="text-dark-gray/70">
              다양한 시간표 템플릿을 둘러보고 구매하세요
            </p>
          </div>

          {/* 컨텐츠 영역 */}
          <>
            {/* 정렬 및 필터 컨트롤 */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-dark-gray">
                  정렬:
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="px-3 py-2 border border-tertiary rounded-lg text-sm bg-timetable-input-bg text-dark-gray focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="newest">최신 순</option>
                  <option value="oldest">오래된 순</option>
                </select>
              </div>

              {user && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-dark-gray">
                    구매하지 않은 템플릿만:
                  </span>
                  <button
                    onClick={() => setShowOnlyUnpurchased(!showOnlyUnpurchased)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      showOnlyUnpurchased ? "bg-primary" : "bg-tertiary"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        showOnlyUnpurchased ? "translate-x-6" : "translate-x-1"
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
                  className="group block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-tertiary hover:border-primary/50"
                >
                  <div className="aspect-video bg-timetable-input-bg rounded-t-2xl overflow-hidden">
                    <Image
                      src={
                        template.templates.thumbnail_url ||
                        `/thumbnail/${template.template_id}.png`
                      }
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
                            '<div class="w-full h-full flex items-center justify-center text-dark-gray/40">썸네일 이미지 없음</div>';
                        }
                      }}
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="font-semibold text-lg text-dark-gray group-hover:text-primary transition-colors mb-2">
                      {template.templates.name}
                    </h3>
                    <p className="text-dark-gray/70 text-sm line-clamp-2 mb-4">
                      {template.templates.description}
                    </p>
                    {template.template_plans &&
                      template.template_plans.length > 0 && (
                        <div className="flex items-center gap-3 mb-4">
                          {template.template_plans.find(
                            (p) => p.plan === "lite"
                          ) && (
                            <div className="flex-1 bg-tertiary rounded-lg px-3 py-2">
                              <div className="text-xs text-dark-gray/70 mb-1">
                                LITE
                              </div>
                              <div className="text-sm font-bold text-dark-gray">
                                ₩
                                {template.template_plans
                                  .find((p) => p.plan === "lite")!
                                  .price!.toLocaleString()}
                              </div>
                            </div>
                          )}
                          {template.template_plans.find(
                            (p) => p.plan === "pro"
                          ) && (
                            <div className="flex-1 bg-secondary/20 rounded-lg px-3 py-2">
                              <div className="text-xs text-dark-gray mb-1">
                                PRO
                              </div>
                              <div className="text-sm font-bold text-dark-gray">
                                ₩
                                {template.template_plans
                                  .find((p) => p.plan === "pro")!
                                  .price!.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    <div className="flex items-center text-primary text-sm font-medium">
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
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-tertiary">
                  <svg
                    className="w-8 h-8 text-dark-gray/40"
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
                <p className="text-dark-gray/60 text-lg">
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
