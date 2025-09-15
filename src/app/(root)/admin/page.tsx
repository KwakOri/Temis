"use client";

import AccessManagement from "@/components/admin/AccessManagement";
import CustomOrderManagement from "@/components/admin/CustomOrderManagement";
import { DeadlineCalendarView } from "@/components/admin/DeadlineCalendar";
import EmailTemplatePreview from "@/components/admin/EmailTemplatePreview";
import LegacyOrderManagement from "@/components/admin/LegacyOrderManagement";
import PurchaseManagement from "@/components/admin/PurchaseManagement";
import TemplateManagement from "@/components/admin/TemplateManagement";
import UserManagement from "@/components/admin/UserManagement";
import WorkScheduleManagement from "@/components/admin/WorkScheduleManagement";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  MailOpen,
  Palette,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
type TabType =
  | "templates"
  | "users"
  | "access"
  | "emailPreview"
  | "purchases"
  | "customOrders"
  | "legacyOrders"
  | "workSchedule"
  | "workCalendar";

function AdminContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("workCalendar");

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
    { id: "legacyOrders" as TabType, name: "레거시 주문 관리", icon: Archive },
    { id: "purchases" as TabType, name: "결제 대기", icon: CreditCard },
    { id: "templates" as TabType, name: "템플릿 관리", icon: FileText },
    { id: "users" as TabType, name: "사용자 관리", icon: Users },
    { id: "workSchedule" as TabType, name: "작업 일정 관리", icon: Calendar },
    { id: "emailPreview" as TabType, name: "이메일 미리보기", icon: MailOpen },
    { id: "access" as TabType, name: "접근 권한 관리", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-quaternary">
                관리자 대시보드
              </h1>
              <p className="text-secondary mt-1">
                템플릿, 사용자 및 권한을 관리하세요
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-[#F4FDFF] bg-quaternary px-3 py-2 rounded-md shadow-sm">
                <span className="font-medium">관리자:</span> {user?.name} (
                {user?.email})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        {activeTab === "legacyOrders" && <LegacyOrderManagement />}
        {activeTab === "purchases" && <PurchaseManagement />}
        {activeTab === "templates" && <TemplateManagement />}
        {activeTab === "access" && <AccessManagement />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "workSchedule" && <WorkScheduleManagement />}
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
