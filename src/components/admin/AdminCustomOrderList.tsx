"use client";

import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle, Clock, Eye, XCircle } from "lucide-react";
import { AdminOrderListPagination } from "@/components/admin/AdminOrderListControls";
import type { PaginationInfo } from "@/types/admin";

export interface AdminCustomOrderBadge {
  label: string;
  tone: "blue" | "purple" | "green" | "gray" | "orange";
}

export interface AdminCustomOrderRow {
  id: string;
  status: string;
  summary: string;
  users: { name: string; email: string };
  price_quoted: number | null;
  deadline: string | null;
  created_at: string;
  badges?: AdminCustomOrderBadge[];
}

const badgeStyle = cva("rounded px-2 py-1 text-xs", {
  variants: {
    tone: {
      blue: "bg-blue-100 text-blue-800",
      purple: "bg-purple-100 text-purple-800",
      green: "bg-green-100 text-green-800",
      gray: "bg-gray-100 text-gray-600",
      orange: "bg-orange-100 text-orange-800",
    },
  },
});

export default function AdminCustomOrderList({
  orders,
  loading,
  errorMessage,
  pagination,
  onPageChange,
  onSelect,
}: {
  orders: AdminCustomOrderRow[];
  loading: boolean;
  errorMessage?: string | null;
  pagination?: PaginationInfo;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
}) {
  // 상태별 스타일링
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      accepted: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    const labels = {
      pending: "대기 중",
      accepted: "접수됨",
      in_progress: "진행 중",
      completed: "완료",
      cancelled: "취소",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  // 상태별 아이콘
  const getStatusIcon = (status: string) => {
    const iconClass = "w-4 h-4";
    switch (status) {
      case "pending":
        return <Clock className={`${iconClass} text-yellow-600`} />;
      case "accepted":
        return <CheckCircle className={`${iconClass} text-blue-600`} />;
      case "in_progress":
        return <AlertTriangle className={`${iconClass} text-indigo-600`} />;
      case "completed":
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case "cancelled":
        return <XCircle className={`${iconClass} text-red-600`} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500">로딩 중...</p>
        </div>
      ) : errorMessage ? (
        <div role="alert" className="p-8 text-center text-red-600">
          {errorMessage}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          주문 내역이 없습니다.
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    고객 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    견적가격
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마감일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 truncate max-w-48">
                          ID: {order.id.slice(0, 8)}...
                        </div>
                        <div className="text-gray-500 truncate max-w-48">
                          {order.summary.slice(0, 50)}...
                        </div>
                        <div className="flex items-center mt-1 space-x-2">
                          {order.badges?.map((badge) => (
                            <span
                              key={badge.label}
                              className={badgeStyle({ tone: badge.tone })}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {order.users.name}
                        </div>
                        <div className="text-gray-500">{order.users.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        {getStatusBadge(order.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.price_quoted
                        ? `₩${order.price_quoted.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.deadline ? (
                        <div className="flex items-center space-x-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              new Date(order.deadline) < new Date()
                                ? "bg-red-100 text-red-800"
                                : new Date(order.deadline) <=
                                    new Date(
                                      Date.now() + 3 * 24 * 60 * 60 * 1000,
                                    )
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {new Date(order.deadline).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">미설정</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onSelect(order.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-[#F4FDFF] bg-quaternary hover:bg-tertiary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 뷰 */}
          <div className="lg:hidden divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="space-y-3">
                  {/* 주문 ID와 상태 */}
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-gray-500">
                      ID: {order.id.slice(0, 8)}...
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(order.status)}
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* 고객 정보 */}
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {order.users.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.users.email}
                    </div>
                  </div>

                  {/* 주문 요구사항 */}
                  <div className="text-sm text-gray-700">
                    {order.summary.slice(0, 80)}...
                  </div>

                  {/* 태그들 */}
                  <div className="flex flex-wrap gap-2">
                    {order.badges?.map((badge) => (
                      <span
                        key={badge.label}
                        className={badgeStyle({ tone: badge.tone })}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  {/* 추가 정보 */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-500">견적가격</div>
                      <div className="font-medium text-gray-900">
                        {order.price_quoted
                          ? `₩${order.price_quoted.toLocaleString()}`
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">마감일</div>
                      <div>
                        {order.deadline ? (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              new Date(order.deadline) < new Date()
                                ? "bg-red-100 text-red-800"
                                : new Date(order.deadline) <=
                                    new Date(
                                      Date.now() + 3 * 24 * 60 * 60 * 1000,
                                    )
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {new Date(order.deadline).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">미설정</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 생성일 */}
                  <div className="text-xs text-gray-500">
                    생성일:{" "}
                    {new Date(order.created_at).toLocaleDateString("ko-KR")}
                  </div>

                  {/* 버튼 */}
                  <button
                    onClick={() => onSelect(order.id)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#F4FDFF] bg-quaternary hover:bg-tertiary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    상세보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AdminOrderListPagination
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </div>
  );
}
