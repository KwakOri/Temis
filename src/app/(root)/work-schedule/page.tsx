"use client";

import BackButton from "@/components/BackButton";
import { useWorkSchedule } from "@/hooks/query/useWorkSchedule";
import { DeadlineStatus, WorkScheduleOrder } from "@/types/workSchedule";
import { AlertCircle, Calendar, Flame } from "lucide-react";

export default function WorkSchedulePage() {
  // React Query hook
  const { data, isLoading: loading, error } = useWorkSchedule();
  const orders = data?.orders || [];

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
        return `${baseClass} bg-secondary text-white`;
      case "in_progress":
        return `${baseClass} bg-primary text-white`;
      default:
        return `${baseClass} bg-tertiary text-dark-gray`;
    }
  };

  // 마감일 상태 확인
  const getDeadlineStatus = (deadline: string | null): DeadlineStatus => {
    if (!deadline) return "none";

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    if (deadlineDate < now) return "overdue";
    if (deadlineDate <= sevenDaysFromNow) return "urgent";
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
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-holiday text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            {dateString}
          </span>
        );
      case "urgent":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-white">
            <Flame className="w-3 h-3 mr-1" />
            {dateString}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-white">
            <Calendar className="w-3 h-3 mr-1" />
            {dateString}
          </span>
        );
    }
  };

  // 모든 주문을 마감일 기준으로 정렬
  const allOrders = orders.sort((a, b) => {
    // 마감일이 없는 경우 마지막으로
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;

    // 마감일 기준 오름차순 정렬
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // 빠른 마감 여부 확인 함수 (한글/영어 value 모두 지원)
  const isFastDeadline = (order: WorkScheduleOrder) => {
    return (
      order.selected_options?.includes("빠른 마감") ||
      order.selected_options?.includes("fast_delivery") ||
      false
    );
  };

  return (
    <div className="min-h-screen bg-light">
      {/* 헤더 */}
      <div className="bg-timetable-card-bg shadow-sm border-b border-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <BackButton href="/" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark-gray flex items-center">
                <Calendar className="w-8 h-8 mr-3 text-primary" />
                작업 일정표
              </h1>
              <p className="mt-2 text-sm text-dark-gray/70">
                현재 진행 중인 맞춤형 시간표 제작 작업 현황을 확인하실 수
                있습니다.
              </p>
            </div>
            <div className="text-right"></div>
          </div>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="bg-timetable-card-bg border-b border-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-secondary" />
                <span className="text-sm text-dark-gray/70">
                  전체 {allOrders.length}개 주문
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-dark-gray/70">작업 예정표를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-24 h-24 mx-auto text-holiday/30 mb-4" />
            <h3 className="text-xl font-medium text-dark-gray mb-2">
              데이터를 불러올 수 없습니다
            </h3>
            <p className="text-dark-gray/60">
              {error instanceof Error
                ? error.message
                : "알 수 없는 오류가 발생했습니다."}
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-24 h-24 mx-auto text-tertiary mb-4" />
            <h3 className="text-xl font-medium text-dark-gray mb-2">
              진행 중인 작업이 없습니다
            </h3>
            <p className="text-dark-gray/60">
              새로운 맞춤형 시간표 제작 요청이 들어오면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 작업 목록 */}
            <div className="bg-timetable-card-bg rounded-lg shadow-sm border border-tertiary overflow-hidden">
              <div className="px-6 py-4 border-b border-tertiary">
                <h3 className="text-lg font-medium text-dark-gray">
                  전체 작업 일정
                </h3>
                <p className="text-sm text-dark-gray/60">
                  모든 주문의 마감 일정을 마감 예정일 순으로 정렬하여 표시합니다
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-tertiary">
                  <thead className="bg-timetable-input-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-gray/70 uppercase tracking-wider">
                        순번
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-gray/70 uppercase tracking-wider">
                        주문자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-gray/70 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-gray/70 uppercase tracking-wider">
                        마감일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-timetable-card-bg divide-y divide-tertiary">
                    {allOrders.map((order, index) => (
                      <tr
                        key={order.id}
                        className={`hover:bg-timetable-input-hover transition-colors ${
                          order.deadline &&
                          getDeadlineStatus(order.deadline) === "overdue"
                            ? "bg-holiday/10"
                            : order.deadline &&
                              getDeadlineStatus(order.deadline) === "urgent"
                            ? "bg-primary/10"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                              isFastDeadline(order)
                                ? "bg-holiday text-white"
                                : "bg-secondary text-white"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-dark-gray">
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
