"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePortfolios } from "@/hooks/query/usePortfolios";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "전체" },
  { value: "structured", label: "정형" },
  { value: "unstructured", label: "비정형" },
  { value: "team", label: "팀" },
] as const;

export default function PortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "all";
  const currentPage = parseInt(searchParams.get("page") || "1");

  const { data, isLoading, error } = usePortfolios({
    category: currentCategory,
    page: currentPage,
  });

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams();
    params.set("category", category);
    params.set("page", "1");
    router.push(`/portfolio?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set("category", currentCategory);
    params.set("page", page.toString());
    router.push(`/portfolio?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>홈으로 돌아가기</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            포트폴리오
          </h1>
          <p className="text-lg text-gray-600">
            템이스의 다양한 프로젝트를 만나보세요
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => handleCategoryChange(category.value)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentCategory === category.value
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-600">
              포트폴리오를 불러오는 중 오류가 발생했습니다.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && data?.portfolios.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              {currentCategory === "all"
                ? "등록된 포트폴리오가 없습니다."
                : `${
                    CATEGORIES.find((c) => c.value === currentCategory)?.label
                  } 카테고리에 등록된 포트폴리오가 없습니다.`}
            </p>
          </div>
        )}

        {/* Portfolio Grid */}
        {!isLoading && !error && data && data.portfolios.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {data.portfolios.map((portfolio) => (
                <Link
                  key={portfolio.id}
                  href={`/portfolio/${portfolio.id}`}
                  className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-gray-200">
                    <img
                      src={portfolio.thumbnail_url}
                      alt={portfolio.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Category Badge */}
                    <span className="inline-block px-3 py-1 text-xs font-medium text-primary bg-blue-50 rounded-full mb-3">
                      {
                        CATEGORIES.find((c) => c.value === portfolio.category)
                          ?.label
                      }
                    </span>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {portfolio.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {portfolio.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from(
                    { length: data.pagination.totalPages },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-primary text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === data.pagination.totalPages}
                  className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
