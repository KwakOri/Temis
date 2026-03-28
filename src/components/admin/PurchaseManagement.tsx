"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  useAdminPurchaseRequests,
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
} from "@/hooks/query/useAdminPurchases";
import { CreditCard } from "lucide-react";
import { useState } from "react";

export default function PurchaseManagement() {
  const [processingId, setProcessingId] = useState<string | null>(null);

  // React Query로 데이터 관리
  const {
    data: purchaseRequests = [],
    isLoading: loading,
    error,
  } = useAdminPurchaseRequests();

  const approveMutation = useApprovePurchaseRequest();
  const rejectMutation = useRejectPurchaseRequest();

  const handleApprove = async (
    requestId: string,
    templateId: string,
    userId: number,
    planId: string
  ) => {
    setProcessingId(requestId);

    try {
      await approveMutation.mutateAsync({
        requestId,
        templateId,
        userId,
        planId,
      });
      alert("결제가 확인되고 권한이 부여되었습니다.");
    } catch (error) {
      console.error("Approval process error:", error);
      alert(
        error instanceof Error ? error.message : "처리 중 오류가 발생했습니다."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm("이 구매 신청을 거절하시겠습니까?")) return;

    setProcessingId(requestId);

    try {
      await rejectMutation.mutateAsync(requestId);
      alert("구매 신청이 거절되었습니다.");
    } catch (error) {
      console.error("Rejection error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "거절 처리 중 오류가 발생했습니다."
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-secondary"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  const pendingRequests = purchaseRequests.filter(
    (req) => req.status === "pending"
  );
  const completedRequests = purchaseRequests.filter(
    (req) => req.status !== "pending"
  );

  return (
    <div className="space-y-6">
      <AdminTabHeader
        title="결제 대기 목록"
        description="고객의 템플릿 구매 신청을 관리합니다"
        icon={CreditCard}
      />

      <div className="bg-white shadow rounded-lg">

        {pendingRequests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">대기 중인 구매 신청이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 데스크톱 테이블 뷰 */}
            <div className="hidden lg:block overflow-x-auto">
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
                      고객 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      메시지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      처리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.created_at!).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.template?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {request.template_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          입금자: {request.depositor_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.user?.name || "이름 없음"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.user?.email || "이메일 없음"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="truncate" title={request.message || ""}>
                          {request.message || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : request.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {request.status === "pending"
                            ? "대기중"
                            : request.status === "completed"
                            ? "완료"
                            : "거절"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() =>
                            handleApprove(
                              request.id,
                              request.template_id!,
                              request.user_id!,
                              request.plan_id!
                            )
                          }
                          disabled={processingId === request.id}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingId === request.id
                            ? "처리중..."
                            : "결제확인 및 권한부여"}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                        >
                          거절
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 뷰 */}
            <div className="lg:hidden divide-y divide-gray-200">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    {/* 상태와 신청일시 */}
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-gray-500">
                        {new Date(request.created_at!).toLocaleString("ko-KR")}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {request.status === "pending"
                          ? "대기중"
                          : request.status === "completed"
                          ? "완료"
                          : "거절"}
                      </span>
                    </div>

                    {/* 템플릿 정보 */}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {request.template?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {request.template_id}
                      </div>
                    </div>

                    {/* 고객 정보 */}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        입금자: {request.depositor_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.user?.name || "이름 없음"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.user?.email || "이메일 없음"}
                      </div>
                    </div>

                    {/* 메시지 */}
                    {request.message && (
                      <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {request.message}
                      </div>
                    )}

                    {/* 버튼들 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleApprove(
                            request.id,
                            request.template_id!,
                            request.user_id!,
                            request.plan_id!
                          )
                        }
                        disabled={processingId === request.id}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingId === request.id
                          ? "처리중..."
                          : "결제확인 및 권한부여"}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="bg-red-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 처리 완료된 신청 목록 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-medium text-gray-900">
            처리 완료된 신청
          </h2>
        </div>

        {completedRequests.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">처리 완료된 신청이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 데스크톱 테이블 뷰 */}
            <div className="hidden lg:block overflow-x-auto">
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
                      고객 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.created_at!).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.template?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          입금자: {request.depositor_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.user?.name || "이름 없음"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.user?.email || "이메일 없음"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {request.status === "completed" ? "완료" : "거절"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 뷰 */}
            <div className="lg:hidden divide-y divide-gray-200">
              {completedRequests.map((request) => (
                <div key={request.id} className="p-4">
                  <div className="space-y-3">
                    {/* 상태와 신청일시 */}
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-gray-500">
                        {new Date(request.created_at!).toLocaleString("ko-KR")}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {request.status === "completed" ? "완료" : "거절"}
                      </span>
                    </div>

                    {/* 템플릿 정보 */}
                    <div className="text-sm font-medium text-gray-900">
                      {request.template?.name}
                    </div>

                    {/* 고객 정보 */}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        입금자: {request.depositor_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.user?.name || "이름 없음"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.user?.email || "이메일 없음"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
