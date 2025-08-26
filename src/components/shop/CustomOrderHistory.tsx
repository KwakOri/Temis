"use client";

import { FilePreviewItem } from "@/components/FilePreview";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import CustomOrderForm from "./CustomOrderForm";

// CustomOrderForm에서 사용하는 타입들
interface Step1Data {
  youtubeSnsAddress: string;
  emailDiscord: string;
}

interface Step2Data {
  orderRequirements: string;
  hasCharacterImages: boolean;
  characterImageFiles: FilePreviewItem[];
  characterImageFileIds: string[];
  wantsOmakase: boolean;
  designKeywords: string;
  referenceFiles: FilePreviewItem[];
  referenceFileIds: string[];
}

interface Step3Data {
  fastDelivery: boolean;
  portfolioPrivate: boolean;
  reviewEvent: boolean;
  priceQuoted: number;
  depositorName: string;
}

type CustomFormData = Step1Data & Step2Data & Step3Data & { orderId?: string };

// 주문 이력 조회 시 사용하는 완전한 데이터 (상태 정보 포함)
interface CustomOrderWithStatus {
  id: string;
  youtube_sns_address: string;
  email_discord: string;
  order_requirements: string;
  has_character_images: boolean;
  wants_omakase: boolean;
  design_keywords: string;
  selected_options: string[];
  status: "pending" | "in_progress" | "completed" | "cancelled";
  price_quoted?: number;
  depositor_name?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function CustomOrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomOrderWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] =
    useState<CustomOrderWithStatus | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/shop/custom-order", {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        setOrders(result.orders || []);
      } else {
        console.error("Failed to fetch custom orders");
      }
    } catch (error) {
      console.error("Error fetching custom orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "in_progress":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "in_progress":
        return "제작중";
      case "completed":
        return "완료";
      case "cancelled":
        return "취소됨";
      default:
        return "알 수 없음";
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass =
      "inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full";

    switch (status) {
      case "pending":
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case "in_progress":
        return `${baseClass} bg-blue-100 text-blue-800`;
      case "completed":
        return `${baseClass} bg-green-100 text-green-800`;
      case "cancelled":
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  // CustomOrderWithStatus를 CustomOrderData로 변환
  const convertToOrderData = (order: CustomOrderWithStatus) => ({
    id: order.id,
    youtube_sns_address: order.youtube_sns_address,
    email_discord: order.email_discord,
    order_requirements: order.order_requirements,
    has_character_images: order.has_character_images,
    wants_omakase: order.wants_omakase,
    design_keywords: order.design_keywords,
    selected_options: order.selected_options,
    price_quoted: order.price_quoted || 0,
    depositor_name: order.depositor_name || "",
  });

  // 주문 수정 핸들러
  const handleEditOrder = (order: CustomOrderWithStatus) => {
    setEditingOrder(order);
    setShowEditForm(true);
  };

  // 주문 수정 제출 핸들러
  const handleEditSubmit = async (formData: CustomFormData) => {
    if (!editingOrder) return;

    try {
      const response = await fetch("/api/shop/custom-order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          orderId: editingOrder.id,
          ...formData,
        }),
      });

      if (response.ok) {
        alert("주문이 성공적으로 수정되었습니다.");
        setShowEditForm(false);
        setEditingOrder(null);
        fetchOrders(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(error.error || "수정 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Edit order error:", error);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  // 주문 취소 핸들러
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("정말로 이 주문을 취소하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/shop/custom-order?orderId=${orderId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        alert("주문이 성공적으로 취소되었습니다.");
        fetchOrders(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(error.error || "취소 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Cancel order error:", error);
      alert("취소 중 오류가 발생했습니다.");
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          맞춤형 시간표 제작 신청 내역
        </h2>
        <p className="text-sm text-slate-600">
          제작 신청한 커스텀 시간표의 진행 상황을 확인할 수 있습니다
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-slate-100">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-lg">아직 신청한 내역이 없습니다.</p>
          <p className="text-sm text-slate-400 mt-1">
            맞춤형 시간표 제작을 신청해보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {order.youtube_sns_address}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {new Date(order.created_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span className={getStatusBadge(order.status)}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-1">
                    제작 요구사항
                  </h4>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {order.order_requirements}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <span>오마카세:</span>
                    <span
                      className={
                        order.wants_omakase
                          ? "text-green-600"
                          : "text-slate-400"
                      }
                    >
                      {order.wants_omakase ? "예" : "아니요"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>캐릭터 이미지:</span>
                    <span
                      className={
                        order.has_character_images
                          ? "text-green-600"
                          : "text-slate-400"
                      }
                    >
                      {order.has_character_images ? "첨부됨" : "없음"}
                    </span>
                  </div>
                </div>

                {order.design_keywords && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-1">
                      디자인 키워드
                    </h4>
                    <p className="text-sm text-slate-600">
                      {order.design_keywords}
                    </p>
                  </div>
                )}

                {order.depositor_name && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-1">
                      입금자명
                    </h4>
                    <p className="text-sm text-slate-600">
                      {order.depositor_name}
                    </p>
                  </div>
                )}

                {order.price_quoted && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-700">
                      견적 금액
                    </span>
                    <span className="text-lg font-bold text-[#1e3a8a]">
                      ₩{order.price_quoted.toLocaleString()}
                    </span>
                  </div>
                )}

                {order.admin_notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      관리자 메모
                    </h4>
                    <p className="text-sm text-blue-700">{order.admin_notes}</p>
                  </div>
                )}

                {/* 수정/취소 버튼 (pending 상태에서만 표시) */}
                {order.status === "pending" && (
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleEditOrder(order)}
                      className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      수정
                    </button>
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 수정 폼 모달 */}
      {showEditForm && editingOrder && (
        <CustomOrderForm
          onClose={() => {
            setShowEditForm(false);
            setEditingOrder(null);
          }}
          onSubmit={handleEditSubmit}
          existingOrder={
            editingOrder ? convertToOrderData(editingOrder) : undefined
          }
          isEditMode={true}
        />
      )}
    </div>
  );
}
