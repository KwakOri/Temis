"use client";

import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Tables } from "@/types/supabase";

type PurchaseRequest = Tables<'purchase_requests'>;
type Template = Tables<'templates'>;

interface PurchaseRequestWithTemplate extends PurchaseRequest {
  template?: Template;
}

interface PurchaseHistoryData {
  purchaseRequests: PurchaseRequestWithTemplate[];
}

export default function PurchaseHistory() {
  const { user } = useAuth();
  const [data, setData] = useState<PurchaseHistoryData>({
    purchaseRequests: [],
  });
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ depositorName: "", message: "" });

  useEffect(() => {
    if (user) {
      fetchPurchaseHistory();
    }
  }, [user]);

  const fetchPurchaseHistory = async () => {
    try {
      const response = await fetch("/api/user/purchase-history", {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error("Failed to fetch purchase history");
      }
    } catch (error) {
      console.error("Error fetching purchase history:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (request: PurchaseRequestWithTemplate) => {
    setEditingRequest(request.id);
    setEditForm({
      depositorName: request.customer_name,
      message: request.message || "",
    });
  };

  const cancelEdit = () => {
    setEditingRequest(null);
    setEditForm({ depositorName: "", message: "" });
  };

  const saveEdit = async (requestId: string) => {
    try {
      const response = await fetch(`/api/user/purchase-requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          depositor_name: editForm.depositorName,
          message: editForm.message,
        }),
      });

      if (response.ok) {
        alert("구매 요청이 수정되었습니다.");
        setEditingRequest(null);
        fetchPurchaseHistory();
      } else {
        const result = await response.json();
        alert(result.error || "수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error updating purchase request:", error);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  const deleteRequest = async (requestId: string) => {
    if (!confirm("이 구매 요청을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/user/purchase-requests/${requestId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        alert("구매 요청이 삭제되었습니다.");
        fetchPurchaseHistory();
      } else {
        const result = await response.json();
        alert(result.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error deleting purchase request:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link
          href="/auth"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: "대기중", class: "bg-yellow-100 text-yellow-800" },
      completed: { text: "완료", class: "bg-green-100 text-green-800" },
      rejected: { text: "거절", class: "bg-red-100 text-red-800" },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}`}
      >
        {config.text}
      </span>
    );
  };

  return (
    <div>
      {/* 구매 요청 내역 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">구매 요청 내역</h2>
          <p className="text-sm text-gray-600">
            템플릿 구매 신청 현황을 확인하고 관리할 수 있습니다
          </p>
        </div>

        {data.purchaseRequests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">구매 요청 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    신청일시
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    템플릿
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    입금자명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메시지
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.purchaseRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.created_at!).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-16 flex-shrink-0">
                          <Image
                            src={`/thumbnail/${request.template?.id}.png`}
                            alt={request.template?.name || ""}
                            width={64}
                            height={40}
                            className="h-10 w-16 rounded object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {request.template?.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingRequest === request.id ? (
                        <input
                          type="text"
                          value={editForm.depositorName}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              depositorName: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-gray-900">
                          {request.customer_name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editingRequest === request.id ? (
                        <textarea
                          value={editForm.message}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm h-16 resize-none"
                        />
                      ) : (
                        <div
                          className="text-gray-500 max-w-xs truncate"
                          title={request.message || ""}
                        >
                          {request.message || "-"}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status || "pending")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === "pending" ? (
                        editingRequest === request.id ? (
                          <div className="space-x-2">
                            <button
                              onClick={() => saveEdit(request.id)}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                            >
                              저장
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="space-x-2">
                            <button
                              onClick={() => startEdit(request)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => deleteRequest(request.id)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                            >
                              삭제
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs">
                          {request.status === "completed"
                            ? "처리완료"
                            : "처리됨"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
