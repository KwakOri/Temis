"use client";

import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Flame,
  Play,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AdminWorkScheduleOrder {
  id: string;
  email_prefix: string;
  deadline: string | null;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  selected_options?: string;
  created_at: string;
  source: "internal" | "legacy";
}

type StatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";
type TabType = "pending_incomplete" | "fast_deadline" | "normal_deadline";

export default function WorkScheduleManagement() {
  const [orders, setOrders] = useState<AdminWorkScheduleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("pending_incomplete");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // 주문 목록 조회 (관리자용 - 모든 상태 포함)
  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/work-schedule", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch admin work schedule:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      }
    } catch (error) {
      console.error("Error fetching admin work schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // 상태별 아이콘
  const getStatusIcon = (status: string) => {
    const iconClass = "w-4 h-4";
    switch (status) {
      case "pending":
        return <Clock className={`${iconClass} text-yellow-600`} />;
      case "accepted":
        return <CheckCircle className={`${iconClass} text-blue-600`} />;
      case "in_progress":
        return <Play className={`${iconClass} text-indigo-600`} />;
      case "completed":
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case "cancelled":
        return <AlertCircle className={`${iconClass} text-red-600`} />;
      default:
        return <Clock className={`${iconClass} text-gray-600`} />;
    }
  };

  // 상태별 라벨
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "accepted":
        return "접수됨";
      case "in_progress":
        return "진행 중";
      case "completed":
        return "완료됨";
      case "cancelled":
        return "취소됨";
      default:
        return "알 수 없음";
    }
  };

  // 상태별 배지 스타일
  const getStatusBadge = (status: string) => {
    const baseClass =
      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    switch (status) {
      case "pending":
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case "accepted":
        return `${baseClass} bg-blue-100 text-blue-800`;
      case "in_progress":
        return `${baseClass} bg-indigo-100 text-indigo-800`;
      case "completed":
        return `${baseClass} bg-green-100 text-green-800`;
      case "cancelled":
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  // 마감일 상태 확인
  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return "none";

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    if (deadlineDate < now) return "overdue";
    if (deadlineDate <= threeDaysFromNow) return "urgent";
    return "normal";
  };

  // 마감일 표시 스타일
  const getDeadlineDisplay = (deadline: string | null) => {
    if (!deadline) {
      return <span className="text-gray-400 text-sm">미설정</span>;
    }

    const status = getDeadlineStatus(deadline);
    const dateString = new Date(deadline).toLocaleDateString("ko-KR");

    switch (status) {
      case "overdue":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            {dateString} (지연됨)
          </span>
        );
      case "urgent":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Flame className="w-3 h-3 mr-1" />
            {dateString} (긴급)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Calendar className="w-3 h-3 mr-1" />
            {dateString}
          </span>
        );
    }
  };

  // 대기중이거나 마감일이 미설정된 주문들 (미입력 상태)
  const pendingIncompleteOrders = orders
    .filter((order) => order.status === "pending" || !order.deadline)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // 빠른 마감 주문들 (빠른 마감 옵션이 포함된 주문들)
  const fastDeadlineOrders = orders
    .filter((order) => {
      // 레거시 주문은 일반 마감에만 표시
      if (order.source === "legacy") return false;

      // selected_options에서 "빠른 마감"이 포함된 주문들만 빠른 마감에 표시
      return order.selected_options?.includes("빠른 마감") || false;
    })
    .filter((order) => {
      if (statusFilter === "all") return true;
      return order.status === statusFilter;
    })
    .sort((a, b) => {
      // 마감일이 없는 경우 최우선
      if (!a.deadline && !b.deadline) {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (!a.deadline) return -1;
      if (!b.deadline) return 1;

      // 마감일 기준 오름차순 정렬
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // 일반 마감 주문들 (빠른 마감이 아닌 모든 주문)
  const normalDeadlineOrders = orders
    .filter((order) => {
      // 레거시 주문은 모두 일반 마감에 표시
      if (order.source === "legacy") return true;

      // 내부 주문 중에서 "빠른 마감"이 포함되지 않은 주문들
      return !order.selected_options?.includes("빠른 마감");
    })
    .filter((order) => {
      if (statusFilter === "all") return true;
      return order.status === statusFilter;
    })
    .sort((a, b) => {
      // 마감일이 없는 경우 최우선
      if (!a.deadline && !b.deadline) {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (!a.deadline) return -1;
      if (!b.deadline) return 1;

      // 마감일 기준 오름차순 정렬
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // 현재 활성 탭에 따른 주문 목록
  const currentOrders =
    activeTab === "pending_incomplete"
      ? pendingIncompleteOrders
      : activeTab === "fast_deadline"
      ? fastDeadlineOrders
      : normalDeadlineOrders;

  // 상태별 카운트
  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    accepted: orders.filter((o) => o.status === "accepted").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="w-6 h-6 mr-3 text-blue-600" />
          작업 일정 관리
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          모든 맞춤형 시간표 제작 주문의 작업 일정을 관리하세요.
        </p>
      </div>

      {/* 상단 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-200 rounded-lg">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab("pending_incomplete")}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "pending_incomplete"
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>미입력 상태</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === "pending_incomplete"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {pendingIncompleteOrders.length}개
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("fast_deadline")}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "fast_deadline"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>빠른 마감</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === "fast_deadline"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {fastDeadlineOrders.length}개
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("normal_deadline")}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "normal_deadline"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>일반 마감</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === "normal_deadline"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {normalDeadlineOrders.length}개
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* 상태 필터 (빠른 마감/일반 마감 탭에서만 표시) */}
      {(activeTab === "fast_deadline" || activeTab === "normal_deadline") && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              상태 필터:
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "all",
                  "pending",
                  "accepted",
                  "in_progress",
                  "completed",
                  "cancelled",
                ] as StatusFilter[]
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {status === "all" ? "전체" : getStatusLabel(status)} (
                  {statusCounts[status]})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">작업 일정을 불러오는 중...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-24 h-24 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            주문이 없습니다
          </h3>
          <p className="text-gray-500">
            새로운 맞춤형 시간표 제작 요청이 들어오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab === "pending_incomplete"
                ? "미입력 상태 주문 목록"
                : activeTab === "fast_deadline"
                ? `빠른 마감 주문 목록 ${
                    statusFilter !== "all"
                      ? `(${getStatusLabel(statusFilter)})`
                      : ""
                  }`
                : `일반 마감 주문 목록 ${
                    statusFilter !== "all"
                      ? `(${getStatusLabel(statusFilter)})`
                      : ""
                  }`}
            </h3>
            <p className="text-sm text-gray-500">
              {activeTab === "pending_incomplete"
                ? "대기중 상태이거나 마감 예정일이 입력되지 않은 주문들입니다"
                : activeTab === "fast_deadline"
                ? "'빠른 마감' 옵션이 선택된 주문의 작업 일정입니다"
                : "일반 마감 주문의 작업 일정입니다 (레거시 주문 포함)"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순번
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문자
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    접수날짜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마감일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출처
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      order.deadline &&
                      getDeadlineStatus(order.deadline) === "overdue"
                        ? "bg-red-50"
                        : order.deadline &&
                          getDeadlineStatus(order.deadline) === "urgent"
                        ? "bg-yellow-50"
                        : order.status === "pending" || !order.deadline
                        ? "bg-orange-50"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-medium text-sm">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.email_prefix}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={getStatusBadge(order.status)}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString("ko-KR")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString(
                          "ko-KR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDeadlineDisplay(order.deadline)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.source === "internal"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.source === "internal" ? "내부" : "레거시"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
