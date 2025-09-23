"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import BackButton from "@/components/BackButton";
import Loading from "@/components/Loading";
import PurchaseHistory from "@/components/shop/PurchaseHistory";
import CustomOrderHistory from "@/components/shop/CustomOrderHistory";
import OrderDetailsModal from "@/components/shop/OrderDetailsModal";
import CustomOrderForm from "@/components/shop/CustomOrderForm";

import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { useUserTemplates } from "@/hooks/query/useUserTemplates";
import { useCancelCustomOrder, useSubmitCustomOrder } from "@/hooks/query/useCustomOrder";
import { Tables } from "@/types/supabase";
import { CustomOrderWithStatus, CustomOrderData, CustomOrderFormData } from "@/types/customOrder";
import { Suspense, useState } from "react";

type Template = Tables<"templates">;
type TabType = "templates" | "purchases" | "custom-orders";

const MyPageContent = () => {
  const router = useRouter();
  const { logout: authLogout } = useAuth();
  const { data, isLoading, error: queryError } = useUserTemplates();
  const cancelOrderMutation = useCancelCustomOrder();
  const submitOrderMutation = useSubmitCustomOrder();

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("templates");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<CustomOrderWithStatus | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<CustomOrderWithStatus | null>(null);

  const templates = data?.templates || [];
  const loading = isLoading;

  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) {
      return;
    }

    try {
      setLogoutLoading(true);
      setError("");

      // AuthContext의 logout 함수를 사용하여 쿠키 제거
      await authLogout();

      // 약간의 지연 후 리다이렉트 (사용자가 메시지를 볼 수 있도록)
    } catch (error) {
      console.error("Logout error:", error);

      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      const authKeys = [
        "auth-token",
        "token",
        "user",
        "access_token",
        "jwt_token",
      ];
      authKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      setError("로그아웃 처리 중 오류가 발생했지만 로그아웃되었습니다.");

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } finally {
      setLogoutLoading(false);
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
    router.push(`/time-table/${template.id}`);
  };

  // 수정 핸들러
  const handleEditOrder = (order: CustomOrderWithStatus) => {
    setEditingOrder(order);
    setShowEditForm(true);
  };

  // 주문 수정 제출 핸들러
  const handleOrderSubmit = async (formData: CustomOrderFormData) => {
    try {
      await submitOrderMutation.mutateAsync(formData);

      alert("주문이 성공적으로 수정되었습니다!");

      // form 닫기
      setShowEditForm(false);
      setEditingOrder(null);
    } catch (error) {
      console.error("Order submission error:", error);
      alert(
        error instanceof Error ? error.message : "수정 중 오류가 발생했습니다."
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
        error instanceof Error ? error.message : "취소 중 오류가 발생했습니다."
      );
    }
  };

  // 상세보기 핸들러
  const handleViewDetails = (order: CustomOrderWithStatus) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  마이페이지
                </h1>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
                  템플릿, 구매 내역, 주문 내역을 한 곳에서 관리하세요.
                </p>
              </div>
              <div className="flex justify-center md:justify-start gap-2">
                <BackButton />
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="w-full md:w-auto px-4 py-2 bg-[#1e3a8a] text-white rounded-md hover:bg-[#1e40af] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {logoutLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      로그아웃 중...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      로그아웃
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 md:mb-6 bg-green-50 border border-green-200 rounded-md p-3 md:p-4">
              <div className="text-sm md:text-base text-green-800">
                {successMessage}
              </div>
              <button
                onClick={() => setSuccessMessage("")}
                className="mt-2 text-xs md:text-sm text-green-600 hover:text-green-800"
              >
                닫기
              </button>
            </div>
          )}

          {/* Error Message */}
          {(error || queryError) && (
            <div className="mb-4 md:mb-6 bg-red-50 border border-red-200 rounded-md p-3 md:p-4">
              <div className="text-sm md:text-base text-red-800">
                {error ||
                  (queryError instanceof Error
                    ? queryError.message
                    : "오류가 발생했습니다.")}
              </div>
              <button
                onClick={() => setError("")}
                className="mt-2 text-xs md:text-sm text-red-600 hover:text-red-800"
              >
                닫기
              </button>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("templates")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === "templates"
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="h-5 w-5"
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
                    <span>내 템플릿</span>
                    {!loading && (
                      <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                        {templates.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("purchases")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === "purchases"
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5H21"
                      />
                    </svg>
                    <span>구매 내역</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("custom-orders")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === "custom-orders"
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                      />
                    </svg>
                    <span>맞춤 주문</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {loading && activeTab === "templates" ? (
                <Loading />
              ) : (
                <>
                  {activeTab === "templates" && (
                    <>
                      {/* Templates Grid */}
                      {templates.length === 0 ? (
                        <div className="text-center py-12 md:py-20">
                          <svg
                            className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400"
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
                          <h3 className="mt-3 md:mt-4 text-base md:text-lg font-medium text-gray-900">
                            템플릿이 없습니다
                          </h3>
                          <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-500 px-4">
                            아직 접근 권한이 부여된 템플릿이 없습니다.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                          {templates.map((template) => (
                            <div
                              key={`${template.templates.id}-${template.id}`}
                              onClick={() => handleTemplateClick(template.templates)}
                              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer brightness-100 hover:brightness-75"
                            >
                              {/* Template Thumbnail */}
                              <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                                {template.templates.id ? (
                                  <img
                                    src={`/thumbnail/${template.templates.id}.png`}
                                    alt={template.templates.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg
                                      className="h-8 w-8 md:h-12 md:w-12 text-gray-400"
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
                              <div className="p-3 md:p-4">
                                <div className="flex items-start justify-between mb-1 md:mb-2">
                                  <h3 className="text-sm md:text-lg font-semibold text-gray-900 truncate">
                                    {template.templates.name}
                                  </h3>
                                  <span
                                    className={`ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full border ${getAccessLevelColor(
                                      template.access_level
                                    )}`}
                                  >
                                    {getAccessLevelText(template.access_level)}
                                  </span>
                                </div>

                                {template.templates.description && (
                                  <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 line-clamp-2">
                                    {template.templates.description}
                                  </p>
                                )}

                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <span
                                      className={`inline-flex px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                                        template.templates.is_public
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {template.templates.is_public ? "공개" : "비공개"}
                                    </span>
                                  </div>
                                  {template.granted_at && (
                                    <span className="text-xs">
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

                  {activeTab === "purchases" && <PurchaseHistory />}

                  {activeTab === "custom-orders" && (
                    <CustomOrderHistory
                      onEditOrder={handleEditOrder}
                      onCancelOrder={handleCancelOrder}
                      onViewDetails={handleViewDetails}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* 주문 상세보기 모달 */}
          {showDetailsModal && selectedOrder && (
            <OrderDetailsModal
              order={selectedOrder}
              isOpen={showDetailsModal}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedOrder(null);
              }}
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