import { TemplatePurchaseRequestWithRelations } from "@/types/admin";

export class AdminPurchaseService {
  private static baseUrl = "/api/admin/purchase-requests";

  static async getPurchaseRequests(): Promise<TemplatePurchaseRequestWithRelations[]> {
    const response = await fetch(this.baseUrl, { credentials: "include" });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.error || "구매 요청을 가져오는데 실패했습니다.");
    }

    return result?.requests ?? [];
  }

  static async updatePurchaseRequestStatus(
    requestId: string,
    status: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(
        result?.error || "구매 요청 상태 업데이트에 실패했습니다."
      );
    }
  }

  // 통합 승인 프로세스: 접근 권한 부여, 구매 요청 완료 처리, 메일 발송을 서버가 처리한다.
  static async approvePurchaseRequest(
    requestId: string,
    planId?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${requestId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ planId }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error || "권한 부여에 실패했습니다.");
    }
  }
}
