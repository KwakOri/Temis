"use client";

import AccessManagement from "@/components/admin/AccessManagement";
import CustomOrderManagement from "@/components/admin/CustomOrderManagement";
import { DeadlineCalendarView } from "@/components/admin/DeadlineCalendar";
import EmailTemplatePreview from "@/components/admin/EmailTemplatePreview";
import PortfolioManagement from "@/components/admin/PortfolioManagement";
import PurchaseManagement from "@/components/admin/PurchaseManagement";
import SettingsManagement from "@/components/admin/SettingsManagement";
import TeamManagement from "@/components/admin/TeamManagement";
import TeamTemplateManagement from "@/components/admin/TeamTemplateManagement";
import TemplateManagement from "@/components/admin/TemplateManagement";
import ThumbnailManagement from "@/components/admin/ThumbnailManagement";
import UserManagement from "@/components/admin/UserManagement";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTabOrders } from "@/hooks/query/useTabOrder";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Image,
  Loader2,
  MailOpen,
  Menu,
  Palette,
  Settings,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
type TabType =
  | "templates"
  | "thumbnails"
  | "users"
  | "teams"
  | "teamTemplates"
  | "access"
  | "emailPreview"
  | "purchases"
  | "customOrders"
  | "workCalendar"
  | "portfolios"
  | "settings";

// Default tab configuration - 컴포넌트 외부로 이동
const defaultTabs = [
  { id: "workCalendar" as TabType, name: "작업 캘린더", icon: Calendar },
  { id: "customOrders" as TabType, name: "맞춤 제작 주문", icon: Palette },
  { id: "purchases" as TabType, name: "결제 대기", icon: CreditCard },
  { id: "templates" as TabType, name: "템플릿 관리", icon: FileText },
  { id: "thumbnails" as TabType, name: "썸네일 관리", icon: Image },
  { id: "portfolios" as TabType, name: "포트폴리오 관리", icon: Briefcase },
  { id: "users" as TabType, name: "사용자 관리", icon: Users },
  { id: "teams" as TabType, name: "팀 관리", icon: UserCheck },
  { id: "teamTemplates" as TabType, name: "팀 템플릿", icon: FileText },
  { id: "emailPreview" as TabType, name: "이메일 미리보기", icon: MailOpen },
  { id: "access" as TabType, name: "접근 권한 관리", icon: Shield },
  { id: "settings" as TabType, name: "설정", icon: Settings },
];

function AdminContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("workCalendar");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // React Query로 관리자 권한 확인
  // const {
  //   data: permissionData,
  //   isLoading: loading,
  //   error,
  // } = useAdminPermission(!!user);

  const isAdmin = user?.isAdmin || false;

  // Fetch tab orders from database
  const { data: tabOrders, isLoading: isLoadingTabOrders } = useTabOrders();

  // Sort and filter tabs based on database order
  const tabs = useMemo(() => {
    if (!tabOrders || tabOrders.length === 0) {
      // If no tab orders from DB, use default order
      return defaultTabs;
    }

    // Create a map of tab configurations for quick lookup
    const tabMap = new Map(defaultTabs.map((tab) => [tab.id, tab]));

    // Sort by order_index and filter by is_visible
    return tabOrders
      .filter((order) => order.is_visible)
      .sort((a, b) => a.order_index - b.order_index)
      .map((order) => tabMap.get(order.tab_id as TabType))
      .filter((tab) => tab !== undefined) as typeof defaultTabs;
  }, [tabOrders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-secondary font-medium">
            관리자 권한 확인 중...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-red-500 mb-6">
            <AlertTriangle className="mx-auto h-16 w-16" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3">
            접근 권한 없음
          </h2>
          <p className="text-secondary mb-6">
            관리자 권한이 필요한 페이지입니다.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-primary text-[#F4FDFF] rounded-md hover:bg-secondary transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-timetable-form-bg">
      {/* Header - 모바일만 표시 */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            {/* 뒤로가기 버튼 (모바일) */}
            <button
              onClick={() => (window.location.href = "/")}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="홈으로"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>

            {/* 타이틀 */}
            <h1 className="flex-1 text-center text-xl sm:text-2xl font-bold text-quaternary">
              대시보드
            </h1>

            {/* 햄버거 버튼 (모바일) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="메뉴"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 오버레이 메뉴 */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* 반투명 배경 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* 메뉴 컨텐츠 */}
          <div className="absolute top-0 left-0 right-0 bg-white shadow-lg">
            {/* 헤더 */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-dark-gray">대시보드</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            {/* 메뉴 아이템 */}
            <nav className="px-4 sm:px-6 py-4 max-h-[calc(100vh-80px)] overflow-y-auto">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-5 py-4 rounded-lg transition-colors mb-2 ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-primary font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                    <span className="text-base">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Floating Sidebar (데스크톱) */}
      <div className="hidden lg:block">
        <div className="fixed left-6 top-6 bottom-6 z-40 flex flex-col gap-4 group">
          {/* 홈 버튼 */}
          <button
            onClick={() => (window.location.href = "/")}
            className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-start px-4 text-gray-600 hover:text-primary hover:bg-white transition-all duration-300 shrink-0 group-hover:w-48"
            aria-label="홈으로"
          >
            <ArrowLeft className="w-6 h-6 shrink-0" />
            <span className="ml-0 group-hover:ml-3 font-medium text-sm whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300">
              홈으로
            </span>
          </button>

          {/* 탭 네비게이션 - 확장 가능 */}
          <div className="flex-1 min-h-0 w-20 group-hover:w-48 transition-all duration-300">
            <div className="h-full bg-white/80 backdrop-blur-sm rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-hide p-3 space-y-2">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative w-full h-14 rounded-2xl flex items-center px-4 transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-white shadow-[0_4px_14px_0_rgba(59,130,246,0.4)]"
                          : "text-gray-400 hover:text-gray-700 hover:bg-gray-100/80"
                      }`}
                      aria-label={tab.name}
                    >
                      <IconComponent className="w-6 h-6 shrink-0" />
                      <span className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300">
                        {tab.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="lg:pl-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "workCalendar" && <DeadlineCalendarView />}
        {activeTab === "customOrders" && <CustomOrderManagement />}
        {activeTab === "purchases" && <PurchaseManagement />}
        {activeTab === "templates" && <TemplateManagement />}
        {activeTab === "thumbnails" && <ThumbnailManagement />}
        {activeTab === "portfolios" && <PortfolioManagement />}
        {activeTab === "access" && <AccessManagement />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "teams" && <TeamManagement />}
        {activeTab === "teamTemplates" && <TeamTemplateManagement />}
        {activeTab === "emailPreview" && <EmailTemplatePreview />}
        {activeTab === "settings" && <SettingsManagement />}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}
