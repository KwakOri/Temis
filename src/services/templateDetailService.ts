import {
  PurchaseRequestData,
  PurchaseRequestResponse,
  ShopTemplateWithPlans,
} from "@/types/templateDetail";

export class PurchaseRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PurchaseRequestError";
    this.status = status;
    this.code = code;
  }
}

export class TemplateDetailService {
  static async getTemplateDetail(
    templateId: string,
  ): Promise<ShopTemplateWithPlans> {
    const response = await fetch(
      `/api/shop/templates/${encodeURIComponent(templateId)}`,
    );
    const result = (await response.json().catch(() => null)) as {
      template?: ShopTemplateWithPlans;
      error?: string;
    } | null;

    if (!response.ok || !result?.template) {
      throw new Error(result?.error || "템플릿을 찾을 수 없습니다.");
    }

    return result.template;
  }

  static async submitPurchaseRequest(
    requestData: PurchaseRequestData,
  ): Promise<PurchaseRequestResponse> {
    const response = await fetch("/api/template-purchase-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestData),
    });

    const result = (await response.json().catch(() => null)) as
      (PurchaseRequestResponse & { error?: string; code?: string }) | null;

    if (!response.ok) {
      throw new PurchaseRequestError(
        result?.error || "구매 신청 중 오류가 발생했습니다.",
        response.status,
        result?.code,
      );
    }

    return result ?? { success: true };
  }
}
