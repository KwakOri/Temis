"use client";

import ThumbnailOrderDetailModal from "@/components/admin/ThumbnailOrderDetailModal";
import {
  useAdminThumbnailOrders,
  useCompleteThumbnailCustomOrder,
  useUpdateAdminThumbnailOrder,
} from "@/hooks/query/useAdminOrders";
import type {
  AdminUpdateThumbnailCustomOrderData,
  ThumbnailCustomOrder,
} from "@/types/customThumbnailOrder";
import {
  CheckCircle,
  Clock,
  Eye,
  Image as ImageIcon,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";

const statusLabel: Record<string, string> = {
  pending: "대기 중",
  accepted: "접수됨",
  in_progress: "진행 중",
  completed: "완료",
  cancelled: "취소",
};

const statusClassName: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const getStatusIcon = (status: string) => {
  if (status === "completed") {
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  }
  if (status === "cancelled") {
    return <XCircle className="h-4 w-4 text-red-600" />;
  }
  return <Clock className="h-4 w-4 text-indigo-600" />;
};

export default function AdminThumbnailOrdersPanel() {
  const [selectedOrder, setSelectedOrder] =
    useState<ThumbnailCustomOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, error } = useAdminThumbnailOrders({
    status: "all",
    page: 1,
    limit: 50,
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const updateMutation = useUpdateAdminThumbnailOrder();
  const completeMutation = useCompleteThumbnailCustomOrder();
  const orders = data?.orders ?? [];

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const updateOrder = async (
    orderId: string,
    update: AdminUpdateThumbnailCustomOrderData,
  ) => {
    try {
      await updateMutation.mutateAsync({ orderId, data: update });
      closeModal();
    } catch (mutationError) {
      console.error("Thumbnail order update error:", mutationError);
      window.alert(
        mutationError instanceof Error
          ? mutationError.message
          : "썸네일 주문 업데이트에 실패했습니다.",
      );
    }
  };

  const completeOrder = async (orderId: string, resultTemplateId: string) => {
    try {
      await completeMutation.mutateAsync({ orderId, resultTemplateId });
      window.alert("썸네일 주문을 완료하고 고객에게 사용 권한을 부여했습니다.");
      closeModal();
    } catch (mutationError) {
      console.error("Thumbnail order completion error:", mutationError);
      window.alert(
        mutationError instanceof Error
          ? mutationError.message
          : "썸네일 주문 완료 처리에 실패했습니다.",
      );
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-secondary/30 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-secondary/20 bg-secondary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-secondary" />
            <div>
              <h2 className="text-base font-semibold text-primary">
                썸네일 주문제작
              </h2>
              <p className="text-xs text-gray-500">
                고객 전용 4K v2 템플릿 제작과 완료 권한 부여를 관리합니다.
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            총 {data?.pagination.total ?? 0}건
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            썸네일 주문을 불러오는 중...
          </div>
        ) : error ? (
          <div className="p-6 text-sm leading-relaxed text-gray-500">
            썸네일 주문 데이터를 불러오지 못했습니다. migration 적용 후 다시
            확인해주세요.
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            접수된 썸네일 주문이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">
                      썸네일 · 4K
                    </span>
                    <span className="font-mono text-xs text-gray-500">
                      {order.id.slice(0, 8)}...
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          statusClassName[order.status] ||
                          "border-gray-200 bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabel[order.status] || order.status}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.users?.name || "고객"} ·{" "}
                    {order.users?.email || "이메일 없음"}
                  </p>
                  <p className="line-clamp-2 text-sm text-gray-600">
                    {order.purpose} · {order.requirements}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>첨부파일 {order.files?.length ?? 0}개</span>
                    <span>
                      포트폴리오 {order.portfolio_consent ? "동의" : "비공개"}
                    </span>
                    {order.result_template_id && (
                      <span>결과 템플릿 연결됨</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowModal(true);
                  }}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-quaternary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-tertiary"
                >
                  <Eye className="h-4 w-4" />
                  상세·완료 처리
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && selectedOrder && (
        <ThumbnailOrderDetailModal
          order={selectedOrder}
          onClose={closeModal}
          onUpdate={updateOrder}
          onComplete={completeOrder}
          updating={updateMutation.isPending}
          completing={completeMutation.isPending}
        />
      )}
    </>
  );
}
