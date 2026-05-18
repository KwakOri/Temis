import {
  AdminRoyaltySummaryResponse,
  GetRoyaltySalesParams,
  GetRoyaltySalesResponse,
  MarkRoyaltiesPaidData,
  MarkRoyaltiesPaidResponse,
  RoyaltySaleItem,
  UpdateRoyaltyData,
} from "@/types/admin";

export class AdminRoyaltyService {
  private static baseUrl = "/api/admin/royalties";

  static async getSummary(params?: {
    from?: string;
    to?: string;
    status?: "unpaid" | "paid" | "all";
  }): Promise<AdminRoyaltySummaryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);
    if (params?.status) searchParams.set("status", params.status);

    const response = await fetch(
      `${this.baseUrl}/summary${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "로열티 정산 요약을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async getSales(
    params?: GetRoyaltySalesParams
  ): Promise<GetRoyaltySalesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);
    if (params?.artistId) searchParams.set("artistId", params.artistId);
    if (params?.templateId) searchParams.set("templateId", params.templateId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const response = await fetch(
      `${this.baseUrl}/sales${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "로열티 판매 목록을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async updateRoyalty(
    id: string,
    data: UpdateRoyaltyData
  ): Promise<RoyaltySaleItem> {
    const response = await fetch(`${this.baseUrl}/sales/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "로열티 정보 수정에 실패했습니다.");
    }

    const result = await response.json();
    return result.royalty;
  }

  static async markPaid(
    data: MarkRoyaltiesPaidData
  ): Promise<MarkRoyaltiesPaidResponse> {
    const response = await fetch(`${this.baseUrl}/mark-paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "로열티 일괄 지급 처리에 실패했습니다.");
    }

    return response.json();
  }
}
