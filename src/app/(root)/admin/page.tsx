"use client";

import AccessManagement from "@/components/admin/AccessManagement";
import AdminUserRegistration from "@/components/admin/AdminUserRegistration";
import AdminInviteManagement from "@/components/admin/AdminInviteManagement";
import TemplateManagement from "@/components/admin/TemplateManagement";
import UserManagement from "@/components/admin/UserManagement";
import EmailTemplatePreview from "@/components/admin/EmailTemplatePreview";
import PurchaseManagement from "@/components/admin/PurchaseManagement";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
type TabType = "templates" | "users" | "access" | "addUser" | "invites" | "emailPreview" | "purchases";

function AdminContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("templates");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdminPermission = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/admin/users", {
          credentials: "include",
        });

        if (response.status === 403) {
          setIsAdmin(false);
        } else if (response.ok) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Admin permission check failed:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminPermission();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">관리자 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            접근 권한 없음
          </h2>
          <p className="text-gray-600 mb-4">
            관리자 권한이 필요한 페이지입니다.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "templates" as TabType, name: "템플릿 관리", icon: "📄" },
    { id: "users" as TabType, name: "사용자 관리", icon: "👥" },
    { id: "purchases" as TabType, name: "결제 대기", icon: "💳" },
    { id: "invites" as TabType, name: "사용자 초대", icon: "📧" },
    { id: "addUser" as TabType, name: "직접 사용자 추가", icon: "👤➕" },
    { id: "emailPreview" as TabType, name: "이메일 미리보기", icon: "📮" },
    { id: "access" as TabType, name: "접근 권한 관리", icon: "🔐" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                관리자 대시보드
              </h1>
              <p className="text-gray-600">
                템플릿, 사용자 및 권한을 관리하세요
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                관리자: {user?.name} ({user?.email})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "templates" && <TemplateManagement />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "purchases" && <PurchaseManagement />}
        {activeTab === "invites" && <AdminInviteManagement />}
        {activeTab === "addUser" && <AdminUserRegistration />}
        {activeTab === "emailPreview" && <EmailTemplatePreview />}
        {activeTab === "access" && <AccessManagement />}
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
