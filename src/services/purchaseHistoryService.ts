import {
  PurchaseHistoryResponse,
  UpdatePurchaseRequestData,
} from "@/types/purchaseHistory";

export class PurchaseHistoryService {
  private static baseUrl = "/api/user";

  static async getPurchaseHistory(): Promise<PurchaseHistoryResponse> {
    const response = await fetch(`${this.baseUrl}/purchase-history`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("구매 내역을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async updatePurchaseRequest(
    requestId: string,
    data: UpdatePurchaseRequestData
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/purchase-requests/${requestId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "구매 요청 수정에 실패했습니다.");
    }
  }

  static async deletePurchaseRequest(requestId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/purchase-requests/${requestId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "구매 요청 삭제에 실패했습니다.");
    }
  }
}
