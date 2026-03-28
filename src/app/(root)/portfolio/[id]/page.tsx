"use client";

import { use } from "react";
import { usePortfolio } from "@/hooks/query/usePortfolios";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";

const CATEGORIES = [
  { value: "structured", label: "정형" },
  { value: "unstructured", label: "비정형" },
  { value: "team", label: "팀" },
] as const;

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = usePortfolio(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data?.portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <p className="text-red-600 mb-4">
          포트폴리오를 불러오는 중 오류가 발생했습니다.
        </p>
        <button
          onClick={() => router.push("/portfolio")}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const { portfolio } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/portfolio")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>목록으로 돌아가기</span>
        </button>

        {/* Desktop: 3 columns images + 1 column info */}
        {/* Mobile: Info first, then images */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Info Section - Order 1 on mobile, Order 2 on desktop */}
          <div className="lg:col-span-1 lg:order-2 order-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              {/* Category Badge */}
              <span className="inline-block px-3 py-1 text-xs font-medium text-primary bg-blue-50 rounded-full mb-4">
                {
                  CATEGORIES.find((c) => c.value === portfolio.category)
                    ?.label
                }
              </span>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {portfolio.title}
              </h1>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(portfolio.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6"></div>

              {/* Description */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  프로젝트 설명
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {portfolio.description}
                </p>
              </div>
            </div>
          </div>

          {/* Images Section - Order 2 on mobile, Order 1 on desktop */}
          <div className="lg:col-span-3 lg:order-1 order-2">
            <div className="space-y-6">
              {portfolio.image_urls.map((imageUrl, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="relative w-full aspect-video">
                    <img
                      src={imageUrl}
                      alt={`${portfolio.title} - 이미지 ${index + 1}`}
                      className="w-full h-full object-contain bg-gray-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
