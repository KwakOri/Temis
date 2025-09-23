"use client";

import { AlertTriangle, Archive, CheckCircle, Clock, Edit2, Eye, Plus, Trash2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface LegacyOrder {
  id: string;
  email: string;
  nickname: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export default function LegacyOrderManagement() {
  const [orders, setOrders] = useState<LegacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<LegacyOrder | null>(null);
  const [updating, setUpdating] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    status: "pending" as LegacyOrder['status'],
    deadline: "",
  });

  // 레거시 주문 목록 조회
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/legacy-orders", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      } else {
        console.error("Failed to fetch legacy orders");
      }
    } catch (error) {
      console.error("Error fetching legacy orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 새 주문 생성 또는 수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const url = editingOrder 
        ? `/api/admin/legacy-orders/${editingOrder.id}` 
        : "/api/admin/legacy-orders";
      
      const method = editingOrder ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          nickname: formData.nickname,
          status: formData.status,
          deadline: formData.deadline || null,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        handleCloseModal();
      } else {
        console.error("Failed to save legacy order");
      }
    } catch (error) {
      console.error("Error saving legacy order:", error);
    } finally {
      setUpdating(false);
    }
  };

  // 주문 삭제
  const handleDelete = async (orderId: string) => {
    if (!confirm("정말로 이 레거시 주문을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/admin/legacy-orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchOrders();
      } else {
        console.error("Failed to delete legacy order");
      }
    } catch (error) {
      console.error("Error deleting legacy order:", error);
    }
  };

  // 모달 열기
  const handleOpenModal = (order?: LegacyOrder) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        email: order.email,
        nickname: order.nickname,
        status: order.status,
        deadline: order.deadline ? order.deadline.split('T')[0] : "",
      });
    } else {
      setEditingOrder(null);
      setFormData({
        email: "",
        nickname: "",
        status: "pending",
        deadline: "",
      });
    }
    setShowModal(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrder(null);
    setFormData({
      email: "",
      nickname: "",
      status: "pending",
      deadline: "",
    });
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

  // 상태별 배지
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center">
            <Archive className="w-6 h-6 mr-3" />
            레거시 주문 관리
          </h2>
          <p className="mt-1 text-sm text-secondary">
            외부에서 접수된 주문을 임시로 관리합니다. (과도기적 사용)
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 레거시 주문 추가
          </button>
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
            레거시 주문이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    고객 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
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
                        <div className="font-medium text-gray-900">{order.nickname}</div>
                        <div className="text-gray-500">{order.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        {getStatusBadge(order.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.deadline ? (
                        <div className="flex items-center space-x-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              new Date(order.deadline) < new Date()
                                ? "bg-red-100 text-red-800"
                                : new Date(order.deadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {new Date(order.deadline).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">미설정</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenModal(order)}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-primary">
                  {editingOrder ? "레거시 주문 수정" : "새 레거시 주문 추가"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  닉네임
                </label>
                <input
                  type="text"
                  required
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as LegacyOrder['status'] })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">대기 중</option>
                  <option value="accepted">접수됨</option>
                  <option value="in_progress">진행 중</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  마감일 (선택사항)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors"
                >
                  {updating ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}