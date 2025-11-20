"use client";

import AccessManagement from "@/components/admin/AccessManagement";
import CustomOrderManagement from "@/components/admin/CustomOrderManagement";
import { DeadlineCalendarView } from "@/components/admin/DeadlineCalendar";
import EmailTemplatePreview from "@/components/admin/EmailTemplatePreview";

import PurchaseManagement from "@/components/admin/PurchaseManagement";
import TeamManagement from "@/components/admin/TeamManagement";
import TemplateManagement from "@/components/admin/TemplateManagement";
import ThumbnailManagement from "@/components/admin/ThumbnailManagement";
import UserManagement from "@/components/admin/UserManagement";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Image,
  Loader2,
  MailOpen,
  Menu,
  Palette,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
type TabType =
  | "templates"
  | "thumbnails"
  | "users"
  | "teams"
  | "access"
  | "emailPreview"
  | "purchases"
  | "customOrders"
  | "workCalendar";

function AdminContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("workCalendar");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  console.log(user);

  // React Query로 관리자 권한 확인
  // const {
  //   data: permissionData,
  //   isLoading: loading,
  //   error,
  // } = useAdminPermission(!!user);

  const isAdmin = user?.isAdmin || false;

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

  const tabs = [
    { id: "workCalendar" as TabType, name: "작업 캘린더", icon: Calendar },
    { id: "customOrders" as TabType, name: "맞춤 제작 주문", icon: Palette },

    { id: "purchases" as TabType, name: "결제 대기", icon: CreditCard },
    { id: "templates" as TabType, name: "템플릿 관리", icon: FileText },
    { id: "thumbnails" as TabType, name: "썸네일 관리", icon: Image },
    { id: "users" as TabType, name: "사용자 관리", icon: Users },
    { id: "teams" as TabType, name: "팀 관리", icon: UserCheck },
    { id: "emailPreview" as TabType, name: "이메일 미리보기", icon: MailOpen },
    { id: "access" as TabType, name: "접근 권한 관리", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* 뒤로가기 버튼 (모바일) */}
            <button
              onClick={() => window.location.href = '/'}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="홈으로"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>

            {/* 타이틀 - 모바일에서 가운데 정렬 */}
            <h1 className="flex-1 text-center lg:text-left text-xl sm:text-2xl font-bold text-quaternary lg:flex-initial">
              대시보드
            </h1>

            {/* 햄버거 버튼 (모바일) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
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
              <h2 className="text-xl font-bold text-quaternary">대시보드</h2>
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

      {/* Navigation Tabs (데스크톱) */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-secondary hover:text-primary hover:border-gray-300"
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "workCalendar" && <DeadlineCalendarView />}
        {activeTab === "customOrders" && <CustomOrderManagement />}

        {activeTab === "purchases" && <PurchaseManagement />}
        {activeTab === "templates" && <TemplateManagement />}
        {activeTab === "thumbnails" && <ThumbnailManagement />}
        {activeTab === "access" && <AccessManagement />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "teams" && <TeamManagement />}
        {activeTab === "emailPreview" && <EmailTemplatePreview />}
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
