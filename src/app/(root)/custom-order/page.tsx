"use client";

import BackButton from "@/components/BackButton";
import CustomOrderForm from "@/components/shop/CustomOrderForm";
import CustomOrderHistory from "@/components/shop/CustomOrderHistory";
import { FilePreviewItem } from "@/components/FilePreview";
import { useAuth } from "@/contexts/AuthContext";
import { Palette } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface CustomOrderFormData {
  youtubeSnsAddress: string;
  emailDiscord: string;
  orderRequirements: string;
  hasCharacterImages: boolean;
  characterImageFiles: FilePreviewItem[];
  characterImageFileIds: string[];
  wantsOmakase: boolean;
  designKeywords: string;
  referenceFiles: FilePreviewItem[];
  referenceFileIds: string[];
  fastDelivery: boolean;
  portfolioPrivate: boolean;
  reviewEvent: boolean;
  priceQuoted: number;
  depositorName: string;
}

type TabType = "order" | "history";

export default function CustomOrderPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("order");
  const [showOrderForm, setShowOrderForm] = useState(false);

  const handleOrderSubmit = async (formData: CustomOrderFormData) => {
    try {
      console.log("🚀 [Order Submit] 주문 제출 시작:", formData);
      
      const response = await fetch("/api/shop/custom-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ [Order Submit] 주문 제출 성공:", result);
        alert("맞춤형 시간표 제작 신청이 완료되었습니다!");
        setShowOrderForm(false);
        // 주문 내역 탭으로 전환
        setActiveTab("history");
        // 새로고침 제거 - 필요시 CustomOrderHistory에서 데이터를 다시 로드하도록 수정
        console.log("📍 [Order Submit] 새로고침 없이 완료됨");
      } else {
        console.error("❌ [Order Submit] 주문 제출 실패:", result);
        alert(result.error || "신청 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Order submission error:", error);
      alert("신청 중 오류가 발생했습니다.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <BackButton className="mb-6" />

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-[#1e3a8a]">
                <Palette className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                맞춤형 시간표 제작
              </h1>
              <p className="text-slate-600 mb-6">로그인이 필요합니다.</p>
              <Link
                href="/auth"
                className="inline-block bg-[#1e3a8a] text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-semibold"
              >
                로그인하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <BackButton className="mb-6" />

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20 mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-[#1e3a8a]">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              맞춤형 시간표 제작
            </h1>
            <p className="text-slate-600">
              나만의 특별한 시간표를 제작해보세요
            </p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mb-6">
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-8 justify-center">
                <button
                  onClick={() => setActiveTab("order")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "order"
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  새 제작 신청
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "history"
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  신청 내역
                </button>
              </nav>
            </div>
          </div>

          {/* 컨텐츠 영역 */}
          {activeTab === "order" ? (
            <div className="text-center">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  맞춤형 시간표 제작 서비스
                </h2>
                <p className="text-slate-600 mb-6">
                  버튜버를 위한 개성 있는 시간표를 전문가가 직접 제작해드립니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-50 rounded-lg p-6">
                    <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                      8만원
                    </div>
                    <div className="text-sm text-slate-600">기본 제작 비용</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-6">
                    <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                      2-4주
                    </div>
                    <div className="text-sm text-slate-600">제작 기간</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-6">
                    <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                      1만원 할인
                    </div>
                    <div className="text-sm text-slate-600">후기 이벤트 시</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowOrderForm(true)}
                className="bg-[#1e3a8a] text-white px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors font-semibold text-lg"
              >
                제작 신청하기
              </button>
            </div>
          ) : (
            <CustomOrderHistory />
          )}
        </div>
      </div>

      {/* 주문 폼 모달 */}
      {showOrderForm && (
        <CustomOrderForm
          onClose={() => setShowOrderForm(false)}
          onSubmit={handleOrderSubmit}
        />
      )}
    </div>
  );
}
