"use client";

import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/supabase";
import { useEffect, useState } from "react";

type PurchaseRequest = Tables<"purchase_requests">;
type Template = Tables<"templates">;

interface PurchaseRequestWithTemplate extends PurchaseRequest {
  templates?: Template;
}

export default function PurchaseManagement() {
  const [purchaseRequests, setPurchaseRequests] = useState<
    PurchaseRequestWithTemplate[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(
          `
          *,
          template:templates(*)
        `
        )
        .order("created_at", { ascending: false });

      console.log("data => ", data);

      if (error) throw error;
      setPurchaseRequests(data || []);
    } catch (error) {
      console.error("Error fetching purchase requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const approvePurchaseRequest = async (
    requestId: string,
    templateId: string,
    customerEmail: string
  ) => {
    setProcessingId(requestId);

    try {
      // 1. 사용자 찾기 (이메일로)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", customerEmail)
        .single();

      if (userError || !userData) {
        alert(
          "해당 이메일의 사용자를 찾을 수 없습니다. 사용자가 먼저 회원가입을 해야 합니다."
        );
        return;
      }

      // 1.5. 관리자 ID 찾기
      const { data: adminData, error: adminError } = await supabase
        .from("users")
        .select("id")
        .eq("email", "timetable@admin.com")
        .single();

      if (adminError || !adminData) {
        alert("관리자 계정을 찾을 수 없습니다.");
        return;
      }

      // 2. 템플릿 접근 권한 부여
      const { error: accessError } = await supabase
        .from("template_access")
        .insert({
          template_id: templateId,
          user_id: userData.id,
          access_level: "write",
          granted_by: adminData.id,
        });

      if (accessError) {
        console.error("Access grant error:", accessError);
        alert("권한 부여에 실패했습니다.");
        return;
      }

      // 3. 구매 신청 상태 업데이트
      const { error: updateError } = await supabase
        .from("purchase_requests")
        .update({ status: "completed" })
        .eq("id", requestId);

      if (updateError) {
        console.error("Status update error:", updateError);
        alert("상태 업데이트에 실패했습니다.");
        return;
      }

      // 성공 시 목록 새로고침
      alert("결제가 확인되고 권한이 부여되었습니다.");
      fetchPurchaseRequests();
    } catch (error) {
      console.error("Approval process error:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const rejectPurchaseRequest = async (requestId: string) => {
    if (!confirm("이 구매 신청을 거절하시겠습니까?")) return;

    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      alert("구매 신청이 거절되었습니다.");
      fetchPurchaseRequests();
    } catch (error) {
      console.error("Rejection error:", error);
      alert("거절 처리 중 오류가 발생했습니다.");
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

  const pendingRequests = purchaseRequests.filter(
    (req) => req.status === "pending"
  );
  const completedRequests = purchaseRequests.filter(
    (req) => req.status !== "pending"
  );

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-primary">결제 대기 목록</h2>
          <p className="text-sm text-secondary">
            고객의 템플릿 구매 신청을 관리합니다
          </p>
        </div>

        <div className="overflow-x-auto">
          {pendingRequests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">대기 중인 구매 신청이 없습니다.</p>
            </div>
          ) : (
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
                        {request.templates?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {request.template_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        입금자: {request.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.customer_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.customer_phone || "연락처 미등록"}
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
                          approvePurchaseRequest(
                            request.id,
                            request.template_id!,
                            request.customer_email
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
                        onClick={() => rejectPurchaseRequest(request.id)}
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
          )}
        </div>
      </div>

      {/* 처리 완료된 신청 목록 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            처리 완료된 신청
          </h2>
        </div>

        <div className="overflow-x-auto">
          {completedRequests.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">처리 완료된 신청이 없습니다.</p>
            </div>
          ) : (
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
                        {request.templates?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.customer_email}
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
          )}
        </div>
      </div>
    </div>
  );
}
