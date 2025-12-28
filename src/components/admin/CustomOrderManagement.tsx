"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import {
  useAdminCustomOrders,
  useAdminCustomOrdersCalendar,
  useAdminLegacyOrdersCalendar,
  useAdminMigrationStatus,
  useMigrateCustomOrders,
  useUpdateCustomOrderDeadline,
  useUpdateCustomOrderStatus,
} from "@/hooks/query/useAdminOrders";
import { usePriceOptions } from "@/hooks/query/usePricing";
import { getFileUrl } from "@/lib/r2";
import type {
  CustomOrderWithUser,
  FileData,
  LegacyOrder as LegacyOrderType,
} from "@/types/admin";
import { getStatusIconHelper } from "@/utils/custom-order";
import { getOptionDisplayLabel } from "@/utils/optionLabelHelper";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Package,
  Palette,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export default function CustomOrderManagement() {
  const [selectedStatus, setSelectedStatus] = useState<string>("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedOrder, setSelectedOrder] =
    useState<CustomOrderWithUser | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [selectedOrderForDeadline, setSelectedOrderForDeadline] = useState<
    CustomOrderWithUser | LegacyOrderType | null
  >(null);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // React Query hooks
  const {
    data: ordersData,
    isLoading: loading,
    error: ordersError,
  } = useAdminCustomOrders({
    status: selectedStatus,
    page: currentPage,
    limit: 10,
    sortBy,
    sortOrder,
  });

  const updateOrderMutation = useUpdateCustomOrderStatus();
  const updateDeadlineMutation = useUpdateCustomOrderDeadline();
  const migrateMutation = useMigrateCustomOrders();

  const { data: migrationStatus, isLoading: migrationLoading } =
    useAdminMigrationStatus();

  const { data: calendarOrders = [], isLoading: loadingCustomCalendar } =
    useAdminCustomOrdersCalendar(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth()
    );

  const { data: legacyOrders = [], isLoading: loadingLegacyCalendar } =
    useAdminLegacyOrdersCalendar(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth()
    );

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;
  const updating = updateOrderMutation.isPending;
  const migrating = migrateMutation.isPending;
  const loadingCalendar = loadingCustomCalendar || loadingLegacyCalendar;

  // 긴급 작업 계산 (3일 이내) - main orders 데이터에서 계산
  const urgentOrders = orders.filter((order: CustomOrderWithUser) => {
    if (!order.deadline) return false;
    const deadline = new Date(order.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  // For now, set urgentLegacyOrders to empty array as we don't have this data
  const urgentLegacyOrders: LegacyOrderType[] = [];

  const handleMigration = async () => {
    try {
      await migrateMutation.mutateAsync();
    } catch (error) {
      console.error("Migration error:", error);
    }
  };

  // 주문 상태 업데이트
  const updateOrderStatus = async (
    orderId: string,
    status: string,
    notes?: string | null,
    price?: number | null,
    deadline?: string
  ) => {
    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        data: {
          status,
          admin_notes: notes || undefined,
          price_quoted: price || undefined,
          deadline,
        },
      });
      setShowOrderModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

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
    <div className="space-y-6">
      <AdminTabHeader
        title="맞춤형 주문 관리"
        description="고객의 맞춤형 시간표 제작 주문을 관리합니다."
        icon={Palette}
      />

      {/* 마이그레이션 상태 및 버튼 */}
      {migrationStatus && migrationStatus.needsMigration > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-xs sm:text-sm text-yellow-800 mb-2">
            <strong>파일 참조 마이그레이션 필요</strong>
            <br />
            {migrationStatus.needsMigration}개 주문이 마이그레이션이 필요합니다.
          </div>
          <button
            onClick={handleMigration}
            disabled={migrating}
            className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-2 rounded text-xs sm:text-sm font-medium"
          >
            {migrating ? "마이그레이션 중..." : "마이그레이션 실행"}
          </button>
        </div>
      )}

      {/* 필터링 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-4">
          {/* 주문 상태 필터 */}
          <div>
            <label className="block text-sm font-medium text-primary mb-3">
              주문 상태
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "default", label: "기본", color: "gray" },
                { value: "all", label: "전체", color: "gray" },
                { value: "pending", label: "대기 중", color: "yellow" },
                { value: "accepted", label: "접수됨", color: "blue" },
                { value: "in_progress", label: "진행 중", color: "indigo" },
                { value: "completed", label: "완료", color: "green" },
                { value: "cancelled", label: "취소", color: "red" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    setSelectedStatus(status.value);
                    setCurrentPage(1);
                  }}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md border transition-colors ${
                    selectedStatus === status.value
                      ? status.color === "gray"
                        ? "bg-primary text-[#F4FDFF] border-primary"
                        : status.color === "yellow"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : status.color === "blue"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : status.color === "indigo"
                        ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                        : status.color === "green"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-red-100 text-red-800 border-red-200"
                      : "bg-white text-secondary border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* 정렬 기준 */}
          <div>
            <label className="block text-sm font-medium text-primary mb-3">
              정렬 기준
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="created_at">접수 날짜</option>
                <option value="deadline">마감 날짜</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as "asc" | "desc");
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="desc">최신순</option>
                <option value="asc">오래된순</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">로딩 중...</p>
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
                            {order.order_requirements.slice(0, 50)}...
                          </div>
                          <div className="flex items-center mt-1 space-x-2">
                            {order.has_character_images && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                캐릭터 이미지
                              </span>
                            )}
                            {order.wants_omakase && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                오마카세
                              </span>
                            )}
                            {order.files && order.files.length > 0 && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                첨부파일 {order.files.length}개
                              </span>
                            )}
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
                                    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {new Date(order.deadline).toLocaleDateString(
                                "ko-KR"
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
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderModal(true);
                          }}
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
                      {order.order_requirements.slice(0, 80)}...
                    </div>

                    {/* 태그들 */}
                    <div className="flex flex-wrap gap-2">
                      {order.has_character_images && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          캐릭터 이미지
                        </span>
                      )}
                      {order.wants_omakase && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          오마카세
                        </span>
                      )}
                      {order.files && order.files.length > 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          첨부파일 {order.files.length}개
                        </span>
                      )}
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
                                    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {new Date(order.deadline).toLocaleDateString(
                                "ko-KR"
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
                      생성일: {new Date(order.created_at).toLocaleDateString("ko-KR")}
                    </div>

                    {/* 버튼 */}
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderModal(true);
                      }}
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

        {/* 페이지네이션 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1)
                    )
                  }
                  disabled={currentPage >= pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    총 <span className="font-medium">{pagination.total}</span>개
                    중{" "}
                    <span className="font-medium">
                      {(currentPage - 1) * pagination.limit + 1}
                    </span>
                    -
                    <span className="font-medium">
                      {Math.min(
                        currentPage * pagination.limit,
                        pagination.total
                      )}
                    </span>
                    개 표시
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      이전
                    </button>
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    )
                      .filter((page) => {
                        const diff = Math.abs(page - currentPage);
                        return (
                          diff <= 2 ||
                          page === 1 ||
                          page === pagination.totalPages
                        );
                      })
                      .map((page, index, array) => {
                        const showEllipsis =
                          index > 0 && array[index - 1] < page - 1;
                        return (
                          <div key={page}>
                            {showEllipsis && (
                              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.min(pagination.totalPages, currentPage + 1)
                        )
                      }
                      disabled={currentPage >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 데드라인 캘린더 뷰 - Temporarily disabled for type resolution */}
      {/* <DeadlineCalendarView
        orders={[]}
        legacyOrders={[]}
        urgentOrders={urgentOrders}
        urgentLegacyOrders={urgentLegacyOrders}
        allOrders={orders} // 미등록 작업 표시용
        onOrderClick={(order) => {
          setSelectedOrderForDeadline(order);
          setShowDeadlineModal(true);
        }}
        currentDate={currentCalendarDate}
        onDateChange={setCurrentCalendarDate}
        loading={loadingCalendar}
      /> */}

      {/* 주문 상세 모달 */}
      {showOrderModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrder(null);
          }}
          onUpdate={updateOrderStatus}
          updating={updating}
        />
      )}

    </div>
  );
}
