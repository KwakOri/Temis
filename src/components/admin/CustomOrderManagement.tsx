"use client";

import { getFileUrl } from "@/lib/r2";
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
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface FileData {
  id: string;
  file_key: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_category: "character_image" | "reference";
  created_at: string;
}

interface CustomOrder {
  id: string;
  user_id: number;
  youtube_sns_address: string;
  email_discord: string;
  order_requirements: string;
  has_character_images: boolean;
  wants_omakase: boolean;
  design_keywords: string | null;
  selected_options: string[] | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  admin_notes: string | null;
  price_quoted: number | null;
  created_at: string;
  updated_at: string;
  users: {
    id: number;
    name: string;
    email: string;
  };
  files: FileData[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CustomOrderManagement() {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    totalOrders: number;
    ordersWithFiles: number;
    migratedOrders: number;
    needsMigration: number;
  } | null>(null);
  const [migrating, setMigrating] = useState(false);

  // 주문 목록 조회
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: selectedStatus,
        page: currentPage.toString(),
        limit: "10",
      });

      const response = await fetch(`/api/admin/custom-orders?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setPagination(data.pagination);
      } else {
        console.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMigrationStatus();
  }, [selectedStatus, currentPage]);

  // 마이그레이션 상태 조회
  const fetchMigrationStatus = async () => {
    try {
      const response = await fetch("/api/admin/migrate-file-references", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch migration status:", error);
    }
  };

  // 파일 참조 마이그레이션 실행
  const runMigration = async () => {
    try {
      setMigrating(true);
      const response = await fetch("/api/admin/migrate-file-references", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `마이그레이션 완료: ${result.migratedCount}개 주문이 업데이트되었습니다.`
        );
        await fetchMigrationStatus();
        await fetchOrders(); // 목록 새로고침
      } else {
        alert("마이그레이션 실패");
      }
    } catch (error) {
      console.error("Migration error:", error);
      alert("마이그레이션 중 오류가 발생했습니다.");
    } finally {
      setMigrating(false);
    }
  };

  // 주문 상태 업데이트
  const updateOrderStatus = async (
    orderId: string,
    status: string,
    notes?: string,
    price?: number
  ) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/custom-orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status,
          admin_notes: notes,
          price_quoted: price,
        }),
      });

      if (response.ok) {
        await fetchOrders(); // 목록 새로고침
        setShowOrderModal(false);
        setSelectedOrder(null);
      } else {
        console.error("Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
    } finally {
      setUpdating(false);
    }
  };

  // 상태별 스타일링
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    const labels = {
      pending: "대기 중",
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
      case "in_progress":
        return <AlertTriangle className={`${iconClass} text-blue-600`} />;
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
      {/* 헤더 */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">맞춤형 주문 관리</h2>
          <p className="mt-1 text-sm text-gray-500">
            고객의 맞춤형 시간표 제작 주문을 관리합니다.
          </p>
        </div>

        {/* 마이그레이션 상태 및 버튼 */}
        {migrationStatus && migrationStatus.needsMigration > 0 && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-sm text-yellow-800 mb-2">
                <strong>파일 참조 마이그레이션 필요</strong>
                <br />
                {migrationStatus.needsMigration}개 주문이 마이그레이션이
                필요합니다.
              </div>
              <button
                onClick={runMigration}
                disabled={migrating}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm font-medium"
              >
                {migrating ? "마이그레이션 중..." : "마이그레이션 실행"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 필터링 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              주문 상태
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "전체", color: "gray" },
                { value: "pending", label: "대기 중", color: "yellow" },
                { value: "in_progress", label: "진행 중", color: "blue" },
                { value: "completed", label: "완료", color: "green" },
                { value: "cancelled", label: "취소", color: "red" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    setSelectedStatus(status.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                    selectedStatus === status.value
                      ? status.color === "gray"
                        ? "bg-gray-100 text-gray-900 border-gray-300"
                        : status.color === "yellow"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : status.color === "blue"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : status.color === "green"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-red-100 text-red-800 border-red-200"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {status.label}
                </button>
              ))}
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
          <div className="overflow-x-auto">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

// 주문 상세 모달 컴포넌트
interface OrderDetailModalProps {
  order: CustomOrder;
  onClose: () => void;
  onUpdate: (
    orderId: string,
    status: string,
    notes?: string,
    price?: number
  ) => Promise<void>;
  updating: boolean;
}

function OrderDetailModal({
  order,
  onClose,
  onUpdate,
  updating,
}: OrderDetailModalProps) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes || "");
  const [price, setPrice] = useState(order.price_quoted || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(order.id, status, notes, price ? Number(price) : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-20">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              주문 상세 정보
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* 주문 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                주문 정보
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">주문 ID</label>
                  <p className="text-sm text-gray-900">{order.id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">생성일</label>
                  <p className="text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">최종 수정일</label>
                  <p className="text-sm text-gray-900">
                    {new Date(order.updated_at).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                고객 정보
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">이름</label>
                  <p className="text-sm text-gray-900">{order.users.name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">이메일</label>
                  <p className="text-sm text-gray-900">{order.users.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    유튜브/SNS 주소
                  </label>
                  <p className="text-sm text-gray-900">
                    {order.youtube_sns_address}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    연락처 (이메일/디스코드)
                  </label>
                  <p className="text-sm text-gray-900">{order.email_discord}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 주문 상세 내용 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">
              주문 상세
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">제작 요구사항</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {order.order_requirements}
                  </p>
                </div>
              </div>

              {order.design_keywords && (
                <div>
                  <label className="text-xs text-gray-500">디자인 키워드</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-900">
                      {order.design_keywords}
                    </p>
                  </div>
                </div>
              )}

              {order.selected_options && order.selected_options.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500">선택된 옵션</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <div className="flex flex-wrap gap-2">
                      {order.selected_options.map((option, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {order.has_character_images && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    캐릭터 이미지 첨부됨
                  </span>
                )}
                {order.wants_omakase && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    오마카세 요청
                  </span>
                )}
                {order.files &&
                  order.files.filter(
                    (f) => f.file_category === "character_image"
                  ).length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      캐릭터 이미지{" "}
                      {
                        order.files.filter(
                          (f) => f.file_category === "character_image"
                        ).length
                      }
                      개
                    </span>
                  )}
                {order.files &&
                  order.files.filter((f) => f.file_category === "reference")
                    .length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      레퍼런스 파일{" "}
                      {
                        order.files.filter(
                          (f) => f.file_category === "reference"
                        ).length
                      }
                      개
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* 첨부파일 관리 */}
          {order.files && order.files.length > 0 && (
            <div>
              <NewFileManager files={order.files} title="주문 첨부파일" />
            </div>
          )}

          {/* 관리자 작업 영역 */}
          <form onSubmit={handleSubmit} className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">
              관리자 작업
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    주문 상태
                  </label>
                  <div className="flex gap-2 justify-between">
                    {[
                      { value: "pending", label: "대기 중", color: "yellow" },
                      { value: "in_progress", label: "진행 중", color: "blue" },
                      { value: "completed", label: "완료", color: "green" },
                      { value: "cancelled", label: "취소", color: "red" },
                    ].map((statusOption) => (
                      <button
                        key={statusOption.value}
                        type="button"
                        onClick={() =>
                          setStatus(
                            statusOption.value as
                              | "pending"
                              | "in_progress"
                              | "completed"
                              | "cancelled"
                          )
                        }
                        className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors grow w-full ${
                          status === statusOption.value
                            ? statusOption.color === "yellow"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                              : statusOption.color === "blue"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : statusOption.color === "green"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {statusOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    견적 가격 (원)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="견적가격을 입력하세요"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  관리자 메모
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="내부 메모나 고객에게 전달할 메시지를 입력하세요"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {updating ? "업데이트 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// 새로운 파일 관리자 컴포넌트
interface NewFileManagerProps {
  files: FileData[];
  title?: string;
}

function NewFileManager({ files, title = "첨부파일" }: NewFileManagerProps) {
  const [expanded, setExpanded] = useState(false);

  // 파일을 카테고리별로 분류
  const characterImages = files.filter(
    (f) => f.file_category === "character_image"
  );
  const referenceFiles = files.filter((f) => f.file_category === "reference");

  // 파일 타입에 따른 아이콘 반환
  const getFileIcon = (mimeType: string) => {
    if (!mimeType) {
      return <File className="h-6 w-6 text-gray-500" />;
    }
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />;
    } else if (mimeType === "application/pdf") {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else {
      return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 개별 파일 다운로드
  const downloadFile = async (fileId: string, originalName: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}/download`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("파일 다운로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  // 전체 파일 ZIP 다운로드
  const downloadAllFiles = async () => {
    try {
      const fileIds = files.map((f) => f.id);

      const response = await fetch("/api/admin/files/download-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ fileIds }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `order-files-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.error || "ZIP 파일 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("ZIP download failed:", error);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
        첨부된 파일이 없습니다.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-900">{title}</span>
          <span className="text-sm text-gray-500">({files.length}개 파일)</span>
        </div>
        <div className="flex items-center space-x-2">
          {expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadAllFiles();
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>전체 다운로드</span>
            </button>
          )}
          <span className="text-gray-400">{expanded ? "▼" : "▶"}</span>
        </div>
      </div>

      {/* 파일 목록 */}
      {expanded && (
        <div className="p-4">
          <div className="space-y-6">
            {/* 캐릭터 이미지 섹션 */}
            {characterImages.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  캐릭터 이미지 ({characterImages.length}개)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {characterImages.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onDownload={() =>
                        downloadFile(file.id, file.original_name)
                      }
                      getFileIcon={getFileIcon}
                      formatFileSize={formatFileSize}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 레퍼런스 파일 섹션 */}
            {referenceFiles.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  레퍼런스 파일 ({referenceFiles.length}개)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {referenceFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onDownload={() =>
                        downloadFile(file.id, file.original_name)
                      }
                      getFileIcon={getFileIcon}
                      formatFileSize={formatFileSize}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 파일 카드 컴포넌트
interface FileCardProps {
  file: FileData;
  onDownload: () => void;
  getFileIcon: (mimeType: string) => React.ReactElement;
  formatFileSize: (bytes: number) => string;
}

function FileCard({
  file,
  onDownload,
  getFileIcon,
  formatFileSize,
}: FileCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = file.mime_type?.startsWith("image/") || false;

  return (
    <div className="relative group bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow">
      {/* 다운로드 버튼 */}
      <button
        onClick={onDownload}
        className="absolute -top-2 -right-2 z-[1] bg-green-500 hover:bg-green-600 text-white rounded-full p-1 shadow-md transition-colors opacity-0 group-hover:opacity-100"
        title="파일 다운로드"
      >
        <Download className="h-3 w-3" />
      </button>

      {/* 파일 미리보기 또는 아이콘 */}
      <div className="aspect-square bg-gray-50 rounded-md mb-2 flex items-center justify-center overflow-hidden relative">
        {isImage && !imageError ? (
          <>
            {/* 로딩 중일 때 보여줄 아이콘 */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                {getFileIcon(file.mime_type || "application/octet-stream")}
              </div>
            )}
            {/* 이미지 */}
            <img
              src={getFileUrl(file.file_key)}
              alt={file.original_name}
              className={`w-full h-full object-cover rounded-md transition-opacity duration-200 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-2">
            {getFileIcon(file.mime_type || "application/octet-stream")}
          </div>
        )}
      </div>

      {/* 파일 정보 */}
      <div className="text-xs text-gray-600">
        <p
          className="font-medium truncate"
          title={file.original_name || "알 수 없는 파일"}
        >
          {file.original_name || "알 수 없는 파일"}
        </p>
        <p className="text-gray-500 mt-1">
          {formatFileSize(file.file_size || 0)}
        </p>
        <p className="text-gray-400 text-xs">
          {file.created_at
            ? new Date(file.created_at).toLocaleDateString("ko-KR")
            : "날짜 불명"}
        </p>
      </div>

      {/* 외부 링크 표시 (이미지인 경우) */}
      {isImage && file.file_key && imageLoaded && !imageError && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(getFileUrl(file.file_key), "_blank");
          }}
          className="absolute top-1 left-1 z-[1] bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="새 창에서 크게 보기"
        >
          <ExternalLink className="h-3 w-3 text-gray-600" />
        </button>
      )}
    </div>
  );
}
