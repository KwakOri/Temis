"use client";

import AccessManagement from "@/components/admin/AccessManagement";
import AdminUserRegistration from "@/components/admin/AdminUserRegistration";
import AdminInviteManagement from "@/components/admin/AdminInviteManagement";
import TemplateManagement from "@/components/admin/TemplateManagement";
import UserManagement from "@/components/admin/UserManagement";
import EmailTemplatePreview from "@/components/admin/EmailTemplatePreview";
import PurchaseManagement from "@/components/admin/PurchaseManagement";
import CustomOrderManagement from "@/components/admin/CustomOrderManagement";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { 
  FileText, 
  Users, 
  CreditCard, 
  Palette, 
  Mail, 
  UserPlus, 
  MailOpen, 
  Shield,
  AlertTriangle,
  ArrowLeft,
  Loader2
} from "lucide-react";
type TabType = "templates" | "users" | "access" | "addUser" | "invites" | "emailPreview" | "purchases" | "customOrders";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-secondary font-medium">관리자 권한 확인 중...</p>
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
    { id: "templates" as TabType, name: "템플릿 관리", icon: FileText },
    { id: "users" as TabType, name: "사용자 관리", icon: Users },
    { id: "purchases" as TabType, name: "결제 대기", icon: CreditCard },
    { id: "customOrders" as TabType, name: "맞춤 제작 주문", icon: Palette },
    { id: "invites" as TabType, name: "사용자 초대", icon: Mail },
    { id: "addUser" as TabType, name: "직접 사용자 추가", icon: UserPlus },
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
                <span className="font-medium">관리자:</span> {user?.name} ({user?.email})
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
        {activeTab === "templates" && <TemplateManagement />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "purchases" && <PurchaseManagement />}
        {activeTab === "customOrders" && <CustomOrderManagement />}
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
