"use client";

import AdminCustomOrderList from "@/components/admin/AdminCustomOrderList";
import AdminSectionTabs from "@/components/admin/AdminSectionTabs";
import {
  AdminOrderListFilters,
  DEFAULT_ADMIN_ORDER_LIST_STATE,
  type AdminOrderListState,
} from "@/components/admin/AdminOrderListControls";
import AdminTabHeader from "@/components/admin/AdminTabHeader";
import AdminThumbnailOrdersPanel from "@/components/admin/AdminThumbnailOrdersPanel";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import {
  useAdminCustomOrders,
  useAdminMigrationStatus,
  useMigrateCustomOrders,
  useUpdateCustomOrderStatus,
} from "@/hooks/query/useAdminOrders";
import type { CustomOrderWithUser } from "@/types/admin";
import { Palette } from "lucide-react";
import { useState } from "react";

export default function CustomOrderManagement() {
  const [activeTab, setActiveTab] = useState<"thumbnail" | "timetable">(
    "thumbnail",
  );
  const [lists, setLists] = useState({
    thumbnail: { ...DEFAULT_ADMIN_ORDER_LIST_STATE },
    timetable: { ...DEFAULT_ADMIN_ORDER_LIST_STATE },
  });
  const list = lists[activeTab];
  const changeList = (value: AdminOrderListState) => {
    setLists((previous) => ({ ...previous, [activeTab]: value }));
  };
  const panelProps = {
    list,
    onPageChange: (page: number) => changeList({ ...list, page }),
  };

  return (
    <div className="space-y-6">
      <AdminTabHeader
        title="맞춤형 주문 관리"
        description="고객의 맞춤형 썸네일·시간표 제작 주문을 관리합니다."
        icon={Palette}
      />
      <AdminSectionTabs
        id="custom-orders"
        label="맞춤 제작 주문 종류"
        items={[
          { value: "thumbnail", label: "썸네일 주문 제작" },
          { value: "timetable", label: "시간표 주문 제작" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
      <div
        role="tabpanel"
        id={`custom-orders-panel-${activeTab}`}
        aria-labelledby={`custom-orders-tab-${activeTab}`}
        className="space-y-6"
      >
        <AdminOrderListFilters value={list} onChange={changeList} />
        {activeTab === "thumbnail" ? (
          <AdminThumbnailOrdersPanel {...panelProps} />
        ) : (
          <TimetableOrdersPanel {...panelProps} />
        )}
      </div>
    </div>
  );
}

function TimetableOrdersPanel({
  list,
  onPageChange,
}: {
  list: AdminOrderListState;
  onPageChange: (page: number) => void;
}) {
  const [selectedOrder, setSelectedOrder] =
    useState<CustomOrderWithUser | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  // React Query hooks
  const {
    data: ordersData,
    isLoading: loading,
    error: ordersError,
  } = useAdminCustomOrders({
    status: list.status,
    page: list.page,
    limit: 10,
    sortBy: list.sortBy,
    sortOrder: list.sortOrder,
  });

  const updateOrderMutation = useUpdateCustomOrderStatus();
  const migrateMutation = useMigrateCustomOrders();

  const { data: migrationStatus } = useAdminMigrationStatus();

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;
  const updating = updateOrderMutation.isPending;
  const migrating = migrateMutation.isPending;
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
    deadline?: string,
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

  return (
    <div className="space-y-6">
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

      {/* 주문 목록 */}
      <AdminCustomOrderList
        orders={orders.map((order) => ({
          ...order,
          summary: order.order_requirements,
          price_quoted: order.price_quoted ?? null,
          deadline: order.deadline ?? null,
          badges: [
            ...(order.has_character_images
              ? [{ label: "캐릭터 이미지", tone: "blue" as const }]
              : []),
            ...(order.wants_omakase
              ? [{ label: "오마카세", tone: "purple" as const }]
              : []),
            ...(order.files?.length
              ? [
                  {
                    label: `첨부파일 ${order.files.length}개`,
                    tone: "green" as const,
                  },
                ]
              : []),
          ],
        }))}
        loading={loading}
        errorMessage={
          ordersError
            ? "시간표 주문을 불러오지 못했습니다. 다시 시도해 주세요."
            : null
        }
        pagination={pagination}
        onPageChange={onPageChange}
        onSelect={(id) => {
          const order = orders.find((item) => item.id === id);
          if (!order) return;
          setSelectedOrder(order);
          setShowOrderModal(true);
        }}
      />

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
