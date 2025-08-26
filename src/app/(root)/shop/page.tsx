"use client";

import BackButton from "@/components/BackButton";
import PurchaseHistory from "@/components/shop/PurchaseHistory";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/supabase";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Template = Tables<"templates"> & {
  template_products: Tables<"template_products">[];
};

type SortOrder = "newest" | "oldest";
type TabType = "shop" | "history";

export default function ShopPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("shop");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showOnlyUnpurchased, setShowOnlyUnpurchased] = useState(false);
  const [unpurchasedTemplateIds, setUnpurchasedTemplateIds] = useState<
    string[]
  >([]);


  useEffect(() => {
    fetchPublicTemplates();
  }, []);

  useEffect(() => {
    fetchPublicTemplates();
  }, [sortOrder]);

  useEffect(() => {
    if (showOnlyUnpurchased && user) {
      fetchUnpurchasedTemplates();
    }
  }, [showOnlyUnpurchased, user]);

  const fetchUnpurchasedTemplates = async () => {
    if (!user) return;

    try {
      // 사용자가 접근 권한이 있는 템플릿 ID들을 가져옴
      const { data: accessData, error: accessError } = await supabase
        .from("template_access")
        .select("template_id")
        .eq("user_id", Number(user.id));

      if (accessError) throw accessError;

      const accessibleTemplateIds =
        accessData?.map((item) => item.template_id) || [];

      // 모든 공개 템플릿 중에서 접근 권한이 없는 템플릿만 필터링
      const unpurchasedIds = templates
        .filter((template) => !accessibleTemplateIds.includes(template.id))
        .map((template) => template.id);

      setUnpurchasedTemplateIds(unpurchasedIds);
    } catch (error) {
      console.error("Error fetching template access:", error);
    }
  };

  const fetchPublicTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select(`*,template_products (*)`)
        .eq("is_public", true)
        .eq("is_shop_visible", true)
        .order("created_at", { ascending: sortOrder === "oldest" });

      if (error) throw error;
      setTemplates(data || []);

      // 정렬 후 비구매 템플릿 필터링도 업데이트
      if (showOnlyUnpurchased && user) {
        fetchUnpurchasedTemplates();
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTemplates = () => {
    if (showOnlyUnpurchased && user) {
      return templates.filter((template) =>
        unpurchasedTemplateIds.includes(template.id)
      );
    }
    return templates;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
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

          {/* 탭 네비게이션 */}
          <div className="mb-6">
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-8 justify-center">
                <button
                  onClick={() => setActiveTab("shop")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "shop"
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  템플릿 둘러보기
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "history"
                        ? "border-[#1e3a8a] text-[#1e3a8a]"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    주문내역
                  </button>
                )}
              </nav>
            </div>
          </div>

          {/* 컨텐츠 영역 */}
          {activeTab === "shop" ? (
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
                {getFilteredTemplates().map((template) => (
                  <Link
                    key={template.id}
                    href={`/shop/${template.id}`}
                    className="group block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-[#1e3a8a]/20"
                  >
                    <div className="aspect-video bg-slate-100 rounded-t-2xl overflow-hidden">
                      <Image
                        src={`/thumbnail/${template.id}.png`}
                        alt={template.name}
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
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-[#1e3a8a] transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                        {template.description}
                      </p>
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

              {getFilteredTemplates().length === 0 && (
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
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20">
              <PurchaseHistory />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
