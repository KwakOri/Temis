"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import BackButton from "@/components/BackButton";
import Loading from "@/components/Loading";
import CustomOrderForm from "@/components/shop/CustomOrderForm";
import CustomOrderHistory from "@/components/shop/CustomOrderHistory";
import OrderDetailsModal from "@/components/shop/OrderDetailsModal";
import PurchaseHistory from "@/components/shop/PurchaseHistory";

import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import {
  useCancelCustomOrder,
  useSubmitCustomOrder,
} from "@/hooks/query/useCustomOrder";
import { useUserTemplates } from "@/hooks/query/useUserTemplates";
import { useUserTeams } from "@/hooks/query/useTeam";
import {
  CustomOrderData,
  CustomOrderFormData,
  CustomOrderWithStatus,
} from "@/types/customOrder";
import { Tables } from "@/types/supabase";
import { Suspense, useEffect, useState } from "react";

type Template = Tables<"templates">;
type TabType = "templates" | "purchases" | "custom-orders";

const MyPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout: authLogout } = useAuth();
  const { data, isLoading, error: queryError } = useUserTemplates();
  const { data: teams, isLoading: teamsLoading } = useUserTeams();
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

  // URL 파라미터에서 탭 읽기
  useEffect(() => {
    const tab = searchParams.get("tab") as TabType | null;
    if (tab && ["templates", "purchases", "custom-orders"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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

  const getPlanText = (plan: string | undefined | null) => {
    if (!plan) return "일반";
    return plan.toUpperCase();
  };

  const getPlanColor = (plan: string | undefined | null) => {
    switch (plan) {
      case "pro":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "lite":
        return "bg-tertiary text-dark-gray border-tertiary";
      default:
        return "bg-tertiary text-dark-gray border-tertiary";
    }
  };

  const handleTemplateClick = (template: Template) => {
    router.push(`/time-table/${template.id}`);
  };

  const handleTeamTemplateClick = (templateId: string) => {
    router.push(`/team-time-table/${templateId}`);
  };

  // 활성화된 팀 중 템플릿이 연결된 팀 필터링
  const activeTeamsWithTemplate = teams?.filter(
    (team) => team.is_active && team.team_template
  ) || [];

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
    required_area: order.required_area,
    fast_delivery: order.fast_delivery,
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
      <div className="min-h-screen bg-gradient-to-br from-light via-timetable-card-bg to-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="w-full flex flex-col md:items-center md:justify-between gap-4">
              <div className="w-full flex justify-between gap-2">
                <BackButton />
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
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
              <div className="w-full text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-dark-gray">
                  마이페이지
                </h1>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-dark-gray/70">
                  템플릿, 구매 내역, 주문 내역을 한 곳에서 관리하세요.
                </p>
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
          <div className="bg-timetable-form-bg rounded-lg shadow overflow-hidden border border-tertiary">
            {/* Tab Navigation */}
            <div className="border-b border-tertiary">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("templates")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === "templates"
                      ? "border-primary text-primary"
                      : "border-transparent text-dark-gray/70 hover:text-dark-gray hover:border-dark-gray/30"
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
                      <span className="bg-tertiary text-dark-gray/70 py-0.5 px-2 rounded-full text-xs">
                        {templates.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("purchases")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === "purchases"
                      ? "border-primary text-primary"
                      : "border-transparent text-dark-gray/70 hover:text-dark-gray hover:border-dark-gray/30"
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
                      ? "border-primary text-primary"
                      : "border-transparent text-dark-gray/70 hover:text-dark-gray hover:border-dark-gray/30"
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
                      {/* Personal Templates Section */}
                      <div className="mb-8">
                        <h2 className="text-lg md:text-xl font-semibold text-dark-gray mb-4">
                          개인 템플릿
                        </h2>
                        {templates.length === 0 ? (
                          <div className="text-center py-12 md:py-20">
                            <svg
                              className="mx-auto h-10 w-10 md:h-12 md:w-12 text-dark-gray/40"
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
                            <h3 className="mt-3 md:mt-4 text-base md:text-lg font-medium text-dark-gray">
                              템플릿이 없습니다
                            </h3>
                            <p className="mt-1 md:mt-2 text-sm md:text-base text-dark-gray/60 px-4">
                              아직 접근 권한이 부여된 템플릿이 없습니다.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {templates.map((template) => (
                              <div
                                key={`${template.templates.id}-${template.id}`}
                                onClick={() =>
                                  handleTemplateClick(template.templates)
                                }
                                className="bg-timetable-card-bg rounded-lg shadow-sm border border-tertiary hover:shadow-md transition-shadow duration-200 cursor-pointer brightness-100 hover:brightness-75"
                              >
                                {/* Template Thumbnail */}
                                <div className="aspect-video bg-timetable-input-bg rounded-t-lg overflow-hidden">
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
                                    <h3 className="text-sm md:text-lg font-semibold text-dark-gray truncate">
                                      {template.templates.name}
                                    </h3>
                                    <span
                                      className={`ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full border ${getPlanColor(
                                        template.template_plan?.plan
                                      )}`}
                                    >
                                      {getPlanText(template.template_plan?.plan)}
                                    </span>
                                  </div>

                                  {template.templates.description && (
                                    <p className="text-xs md:text-sm text-dark-gray/70 mb-2 md:mb-3 line-clamp-2">
                                      {template.templates.description}
                                    </p>
                                  )}

                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0 text-xs text-dark-gray/60">
                                    <div className="flex items-center space-x-1">
                                      <span
                                        className={`inline-flex px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                                          template.templates.is_public
                                            ? "bg-secondary/20 text-secondary"
                                            : "bg-primary/20 text-primary"
                                        }`}
                                      >
                                        {template.templates.is_public
                                          ? "일반"
                                          : "개인"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Team Templates Section */}
                      {!teamsLoading && activeTeamsWithTemplate.length > 0 && (
                        <div className="border-t border-tertiary pt-8">
                          <h2 className="text-lg md:text-xl font-semibold text-dark-gray mb-4">
                            팀 템플릿
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {activeTeamsWithTemplate.map((team) => (
                              <div
                                key={team.id}
                                onClick={() =>
                                  handleTeamTemplateClick(team.team_template!.id)
                                }
                                className="bg-timetable-card-bg rounded-lg shadow-sm border border-tertiary hover:shadow-md transition-shadow duration-200 cursor-pointer brightness-100 hover:brightness-75"
                              >
                                {/* Team Template Thumbnail */}
                                <div className="aspect-video bg-gradient-to-br from-secondary/20 to-primary/20 rounded-t-lg overflow-hidden flex items-center justify-center relative">
                                  <img
                                    src={`/team-thumbnails/${team.team_template!.id}.png`}
                                    alt={team.team_template!.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // 이미지 로드 실패 시 기본 SVG 표시
                                      e.currentTarget.style.display = "none";
                                      const svg =
                                        e.currentTarget.nextElementSibling;
                                      if (svg) {
                                        (svg as HTMLElement).style.display =
                                          "block";
                                      }
                                    }}
                                  />
                                  <svg
                                    className="h-16 w-16 text-secondary absolute"
                                    style={{ display: "none" }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                  </svg>
                                </div>

                                {/* Team Template Info */}
                                <div className="p-3 md:p-4">
                                  <div className="flex items-start justify-between mb-1 md:mb-2">
                                    <h3 className="text-sm md:text-lg font-semibold text-dark-gray truncate">
                                      {team.team_template!.name}
                                    </h3>
                                    <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full border bg-secondary/20 text-secondary border-secondary/30">
                                      팀
                                    </span>
                                  </div>

                                  <p className="text-xs md:text-sm text-dark-gray/70 mb-2">
                                    {team.name}
                                  </p>

                                  {team.team_template!.descriptions && (
                                    <p className="text-xs md:text-sm text-dark-gray/60 line-clamp-2">
                                      {team.team_template!.descriptions}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
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
        <div className="min-h-screen bg-gradient-to-br from-light via-timetable-card-bg to-tertiary flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <MyPageContent />
    </Suspense>
  );
};

export default MyPage;
