"use client";

import BackButton from "@/components/BackButton";
import CustomOrderForm from "@/components/shop/CustomOrderForm";
import CustomOrderHistory from "@/components/shop/CustomOrderHistory";
import { useAuth } from "@/contexts/AuthContext";
import {
  CustomOrderFormData,
  CustomOrderData,
  CustomOrderWithStatus,
  TabType,
} from "@/types/customOrder";
import { useSubmitCustomOrder, useCancelCustomOrder } from "@/hooks/query/useCustomOrder";
import { Palette } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CustomOrderPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("order");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<CustomOrderWithStatus | null>(null);

  const submitOrderMutation = useSubmitCustomOrder();
  const cancelOrderMutation = useCancelCustomOrder();

  const handleOrderSubmit = async (formData: CustomOrderFormData) => {
    try {
      const isEditMode = !!formData.orderId;

      await submitOrderMutation.mutateAsync(formData);

      alert(
        isEditMode
          ? "주문이 성공적으로 수정되었습니다!"
          : "맞춤형 시간표 제작 신청이 완료되었습니다!"
      );

      // form 닫기
      if (isEditMode) {
        setShowEditForm(false);
        setEditingOrder(null);
      } else {
        setShowOrderForm(false);
      }

      // 주문 내역 탭으로 전환
      setActiveTab("history");
    } catch (error) {
      console.error("Order submission error:", error);
      alert(
        error instanceof Error
          ? error.message
          : (formData.orderId
              ? "수정 중 오류가 발생했습니다."
              : "신청 중 오류가 발생했습니다.")
      );
    }
  };

  // 수정 핸들러
  const handleEditOrder = (order: CustomOrderWithStatus) => {
    setEditingOrder(order);
    setShowEditForm(true);
  };

  // 취소 핸들러
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("정말로 이 주문을 취소하시겠습니까?")) {
      return;
    }

    try {
      await cancelOrderMutation.mutateAsync(orderId);
      alert("주문이 성공적으로 취소되었습니다.");
    } catch (error) {
      console.error("Cancel order error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "취소 중 오류가 발생했습니다."
      );
    }
  };

  // CustomOrderWithStatus를 CustomOrderData로 변환
  const convertToOrderData = (
    order: CustomOrderWithStatus
  ): CustomOrderData => ({
    id: order.id,
    youtube_sns_address: order.youtube_sns_address,
    email_discord: order.email_discord,
    order_requirements: order.order_requirements,
    has_character_images: order.has_character_images,
    wants_omakase: order.wants_omakase,
    design_keywords: order.design_keywords,
    selected_options: order.selected_options,
    price_quoted: order.price_quoted || 0,
    depositor_name: order.depositor_name || "",
  });

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
    <>
      {showOrderForm || (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <BackButton className="mb-6" />

            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-white/20 mb-8">
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
                      버튜버를 위한 개성 있는 시간표를 전문가가 직접
                      제작해드립니다.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-slate-50 rounded-lg p-6">
                        <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                          8만원
                        </div>
                        <div className="text-sm text-slate-600">
                          기본 제작 비용
                        </div>
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
                        <div className="text-sm text-slate-600">
                          후기 이벤트 시
                        </div>
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
                <CustomOrderHistory
                  onEditOrder={handleEditOrder}
                  onCancelOrder={handleCancelOrder}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* 신규 주문 폼 모달 */}
      {showOrderForm && (
        <CustomOrderForm
          onClose={() => setShowOrderForm(false)}
          onSubmit={handleOrderSubmit}
        />
      )}

      {/* 수정 주문 폼 모달 */}
      {showEditForm && editingOrder && (
        <CustomOrderForm
          onClose={() => {
            setShowEditForm(false);
            setEditingOrder(null);
          }}
          onSubmit={handleOrderSubmit}
          existingOrder={convertToOrderData(editingOrder)}
          isEditMode={true}
        />
      )}
    </>
  );
}
