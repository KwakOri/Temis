"use client";

import { type AdminOrderListState } from "@/components/admin/AdminOrderListControls";
import AdminCustomOrderList from "@/components/admin/AdminCustomOrderList";
import ThumbnailOrderDetailModal from "@/components/admin/ThumbnailOrderDetailModal";
import {
  useAdminThumbnailOrders,
  useCompleteThumbnailCustomOrder,
  useRevokeThumbnailOrderTemplateGrant,
  useUpdateAdminThumbnailOrder,
} from "@/hooks/query/useAdminOrders";
import type {
  AdminUpdateThumbnailCustomOrderData,
  ThumbnailCustomOrder,
} from "@/types/customThumbnailOrder";
import { useState } from "react";

export default function AdminThumbnailOrdersPanel({
  list,
  onPageChange,
}: {
  list: AdminOrderListState;
  onPageChange: (page: number) => void;
}) {
  const [selectedOrder, setSelectedOrder] =
    useState<ThumbnailCustomOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, error } = useAdminThumbnailOrders({
    ...list,
    limit: 10,
  });
  const updateMutation = useUpdateAdminThumbnailOrder();
  const completeMutation = useCompleteThumbnailCustomOrder();
  const revokeGrantMutation = useRevokeThumbnailOrderTemplateGrant();
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

  const revokeGrant = async (orderId: string, grantId: string) => {
    try {
      await revokeGrantMutation.mutateAsync({ orderId, grantId });
      window.alert("썸네일 템플릿 권한을 회수했습니다.");
      closeModal();
    } catch (mutationError) {
      console.error("Thumbnail order grant revoke error:", mutationError);
      window.alert(
        mutationError instanceof Error
          ? mutationError.message
          : "썸네일 템플릿 권한 회수에 실패했습니다.",
      );
    }
  };

  return (
    <>
      <AdminCustomOrderList
        orders={orders.map((order) => {
          const activeGrantCount = (order.template_grants ?? []).filter(
            (grant) => !grant.revoked_at,
          ).length;
          return {
            id: order.id,
            status: order.status,
            summary: `${order.purpose} · ${order.requirements}`,
            users: {
              name: order.users?.name || "고객",
              email: order.users?.email || "이메일 없음",
            },
            price_quoted: order.price_quoted,
            deadline: order.deadline,
            created_at: order.created_at,
            badges: [
              { label: "썸네일 · 4K", tone: "orange" as const },
              ...(order.files?.length
                ? [
                    {
                      label: `첨부파일 ${order.files.length}개`,
                      tone: "green" as const,
                    },
                  ]
                : []),
              {
                label: `포트폴리오 ${order.portfolio_consent ? "동의" : "비공개"}`,
                tone: "gray" as const,
              },
              {
                label:
                  activeGrantCount > 0
                    ? `템플릿 권한 ${activeGrantCount}개 부여됨`
                    : order.status === "completed"
                      ? "완료 · 권한 미부여"
                      : "권한 미부여",
                tone: "gray" as const,
              },
            ],
          };
        })}
        loading={isLoading}
        errorMessage={
          error
            ? "썸네일 주문을 불러오지 못했습니다. 다시 시도해 주세요."
            : null
        }
        pagination={data?.pagination}
        onPageChange={onPageChange}
        onSelect={(id) => {
          const order = orders.find((item) => item.id === id);
          if (!order) return;
          setSelectedOrder(order);
          setShowModal(true);
        }}
      />

      {showModal && selectedOrder && (
        <ThumbnailOrderDetailModal
          order={selectedOrder}
          onClose={closeModal}
          onUpdate={updateOrder}
          onComplete={completeOrder}
          onRevoke={revokeGrant}
          updating={updateMutation.isPending}
          completing={completeMutation.isPending}
          revoking={revokeGrantMutation.isPending}
        />
      )}
    </>
  );
}
