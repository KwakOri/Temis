import type { CancelCustomOrderResponse } from "@/types/customOrder";
import type {
  SubmitThumbnailCustomOrderResponse,
  ThumbnailCustomOrderFormData,
  ThumbnailCustomOrderHistoryResponse,
  ThumbnailEstimatedDeadlineResponse,
} from "@/types/customThumbnailOrder";

export class CustomThumbnailOrderService {
  private static baseUrl = "/api/shop/custom-order/thumbnail";

  static async getHistory(): Promise<ThumbnailCustomOrderHistoryResponse> {
    const response = await fetch(this.baseUrl, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.error || "썸네일 주문 내역을 가져오는데 실패했습니다.",
      );
    }
    return result;
  }

  static async getEstimatedDeadline(): Promise<ThumbnailEstimatedDeadlineResponse> {
    const response = await fetch(`${this.baseUrl}/estimated-deadline`, {
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.error || "썸네일 예상 마감일을 가져오는데 실패했습니다.",
      );
    }
    return result;
  }

  static async submit(
    formData: ThumbnailCustomOrderFormData,
  ): Promise<SubmitThumbnailCustomOrderResponse> {
    const isEditMode = Boolean(formData.orderId);
    const response = await fetch(this.baseUrl, {
      method: isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(formData),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.error ||
          (isEditMode
            ? "썸네일 주문 수정 중 오류가 발생했습니다."
            : "썸네일 주문 신청 중 오류가 발생했습니다."),
      );
    }
    return result;
  }

  static async cancel(orderId: string): Promise<CancelCustomOrderResponse> {
    const response = await fetch(
      `${this.baseUrl}?orderId=${encodeURIComponent(orderId)}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.error || "썸네일 주문 취소 중 오류가 발생했습니다.",
      );
    }
    return result;
  }
}
