"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTabOrders } from "@/hooks/query/useTabOrder";
import { AdminTabId, getAdminPathByTabId, getAdminTabIdBySegment } from "@/lib/adminTabs";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
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
  UserRound,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const defaultTabs = [
  { id: "workCalendar" as AdminTabId, name: "작업 캘린더", icon: Calendar },
  { id: "customOrders" as AdminTabId, name: "맞춤 제작 주문", icon: Palette },
  { id: "purchases" as AdminTabId, name: "결제 대기", icon: CreditCard },
  { id: "salesStats" as AdminTabId, name: "매출 통계", icon: BarChart3 },
  { id: "templates" as AdminTabId, name: "템플릿 관리", icon: FileText },
  { id: "artists" as AdminTabId, name: "작가 관리", icon: UserRound },
  { id: "thumbnails" as AdminTabId, name: "썸네일 관리", icon: Image },
  { id: "portfolios" as AdminTabId, name: "포트폴리오 관리", icon: Briefcase },
  { id: "users" as AdminTabId, name: "사용자 관리", icon: Users },
  { id: "teams" as AdminTabId, name: "팀 관리", icon: UserCheck },
  { id: "teamTemplates" as AdminTabId, name: "팀 템플릿", icon: FileText },
  { id: "emailPreview" as AdminTabId, name: "이메일 미리보기", icon: MailOpen },
  { id: "access" as AdminTabId, name: "접근 권한 관리", icon: Shield },
  { id: "settings" as AdminTabId, name: "설정", icon: Settings },
];

interface AdminDashboardShellProps {
  children: React.ReactNode;
}

export default function AdminDashboardShell({
  children,
}: AdminDashboardShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentSegment = pathname.split("/")[2] || "";
  const activeTab = getAdminTabIdBySegment(currentSegment);

  const isAdmin = user?.isAdmin || false;
  const { data: tabOrders } = useTabOrders();

  const tabs = useMemo(() => {
    if (!tabOrders || tabOrders.length === 0) {
      return defaultTabs;
    }

    const tabMap = new Map(defaultTabs.map((tab) => [tab.id, tab]));

    return tabOrders
      .filter((order) => order.is_visible)
      .sort((a, b) => a.order_index - b.order_index)
      .map((order) => tabMap.get(order.tab_id as AdminTabId))
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

  const moveToTab = (tabId: AdminTabId) => {
    router.push(getAdminPathByTabId(tabId));
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-timetable-form-bg">
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => (window.location.href = "/")}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="홈으로"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>

            <h1 className="flex-1 text-center text-xl sm:text-2xl font-bold text-quaternary">
              대시보드
            </h1>

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

      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="absolute top-0 left-0 right-0 bg-white shadow-lg">
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

            <nav className="px-4 sm:px-6 py-4 max-h-[calc(100vh-80px)] overflow-y-auto">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => moveToTab(tab.id)}
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

      <div className="hidden lg:block">
        <div className="fixed left-6 top-6 bottom-6 z-40 flex flex-col gap-4 group">
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

          <div className="flex-1 min-h-0 w-20 group-hover:w-48 transition-all duration-300">
            <div className="h-full bg-white/80 backdrop-blur-sm rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-hide p-3 space-y-2">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => moveToTab(tab.id)}
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

      <div className="lg:pl-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
