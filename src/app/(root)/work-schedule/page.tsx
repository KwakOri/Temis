"use client";

import BackButton from "@/components/BackButton";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  Play,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface WorkScheduleOrder {
  id: string;
  email_prefix: string;
  deadline: string | null;
  status: "accepted" | "in_progress";
  selected_options?: string; // 내부 주문의 경우에만 존재
  created_at: string;
  source: "internal" | "legacy";
}

export default function WorkSchedulePage() {
  const [orders, setOrders] = useState<WorkScheduleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"fast" | "normal">("fast");

  // 주문 목록 조회
  const fetchWorkSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/work-schedule", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      } else {
        console.error("Failed to fetch work schedule");
      }
    } catch (error) {
      console.error("Error fetching work schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkSchedule();
  }, []);

  // 상태별 아이콘
  const getStatusIcon = (status: string) => {
    const iconClass = "w-4 h-4";
    switch (status) {
      case "accepted":
        return <CheckCircle className={`${iconClass} text-blue-600`} />;
      case "in_progress":
        return <Play className={`${iconClass} text-indigo-600`} />;
      default:
        return <Clock className={`${iconClass} text-gray-600`} />;
    }
  };

  // 상태별 라벨
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "접수됨";
      case "in_progress":
        return "진행 중";
      default:
        return "알 수 없음";
    }
  };

  // 상태별 배지 스타일
  const getStatusBadge = (status: string) => {
    const baseClass =
      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    switch (status) {
      case "accepted":
        return `${baseClass} bg-blue-100 text-blue-800`;
      case "in_progress":
        return `${baseClass} bg-indigo-100 text-indigo-800`;
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

  // 빠른 마감과 일반 마감으로 분류
  const fastDeadlineOrders = orders
    .filter((order) => {
      // 레거시 주문은 일반 마감에만 표시
      if (order.source === "legacy") return false;

      // selected_options에서 "빠른 마감"이 포함된 주문들만 빠른 마감에 표시
      return order.selected_options?.includes("빠른 마감") || false;
    })
    .sort((a, b) => {
      if (!a.deadline || !b.deadline) return 0;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const normalDeadlineOrders = orders
    .filter((order) => {
      // 레거시 주문은 모두 일반 마감에 표시
      if (order.source === "legacy") return true;

      // 내부 주문 중에서 "빠른 마감"이 포함되지 않은 주문들
      return !order.selected_options?.includes("빠른 마감");
    })
    .sort((a, b) => {
      // 마감일이 없는 경우 마지막으로
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;

      // 마감일 기준 오름차순 정렬
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // 현재 활성 탭에 따른 주문 목록
  const currentOrders =
    activeTab === "fast" ? fastDeadlineOrders : normalDeadlineOrders;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <BackButton href="/" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Calendar className="w-8 h-8 mr-3 text-blue-600" />
                작업 일정표
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                현재 진행 중인 맞춤형 시간표 제작 작업 현황을 확인하실 수
                있습니다.
              </p>
            </div>
            <div className="text-right"></div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("fast")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "fast"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>빠른 마감 일정</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === "fast"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {fastDeadlineOrders.length}개
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("normal")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "normal"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>마감 일정</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === "normal"
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
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">작업 예정표를 불러오는 중...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-24 h-24 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              진행 중인 작업이 없습니다
            </h3>
            <p className="text-gray-500">
              새로운 맞춤형 시간표 제작 요청이 들어오면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 작업 목록 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {activeTab === "fast" ? "빠른 마감 일정" : "마감 일정"}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === "fast"
                    ? "'빠른 마감' 옵션이 선택된 주문의 마감 일정입니다"
                    : "현재 진행중인 마감 일정입니다"}
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
                        마감일
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
                            {/* {getStatusIcon(order.status)} */}
                            <span className={getStatusBadge(order.status)}>
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getDeadlineDisplay(order.deadline)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
