import {
  AdminRoyaltySummaryResponse,
  AdminRoyaltySettlementRunResponse,
  GetArtistRoyaltySettingsResponse,
  GetRoyaltyBatchResponse,
  GetRoyaltyBatchesParams,
  GetRoyaltyBatchesResponse,
  GetRoyaltySalesParams,
  GetRoyaltySalesResponse,
  GetRoyaltyStatementParams,
  GetRoyaltyStatementResponse,
  GetTemplateRoyaltySettingsResponse,
  GetTemplateProductRoyaltySettingsResponse,
  MarkRoyaltiesPaidData,
  MarkRoyaltiesPaidResponse,
  RecalculateRoyaltiesData,
  RecalculateRoyaltiesResponse,
  RoyaltyRuleInput,
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
      throw new Error(error.error || "로열티 일괄 정산 처리에 실패했습니다.");
    }

    return response.json();
  }

  static async getBatches(
    params?: GetRoyaltyBatchesParams
  ): Promise<GetRoyaltyBatchesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const response = await fetch(
      `${this.baseUrl}/batches${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "정산 배치 목록을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async getBatch(batchId: string): Promise<GetRoyaltyBatchResponse> {
    const response = await fetch(`${this.baseUrl}/batches/${batchId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "정산 배치 상세를 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async getStatement(
    params?: GetRoyaltyStatementParams
  ): Promise<GetRoyaltyStatementResponse> {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.set("month", params.month);
    if (params?.artistId) searchParams.set("artistId", params.artistId);

    const response = await fetch(
      `${this.baseUrl}/statements${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "월별 로열티 정산 내역을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async recalculate(
    data: RecalculateRoyaltiesData
  ): Promise<RecalculateRoyaltiesResponse> {
    const response = await fetch(`${this.baseUrl}/recalculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "로열티 재계산에 실패했습니다.");
    }

    return response.json();
  }

  static async getSettlementRun(
    month: string
  ): Promise<AdminRoyaltySettlementRunResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("month", month);

    const response = await fetch(
      `${this.baseUrl}/settlement-run?${searchParams.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "월별 정산 대상 조회에 실패했습니다.");
    }

    return response.json();
  }
}

export class AdminRoyaltySettingsService {
  private static baseUrl = "/api/admin/royalty-settings";

  static async getArtists(): Promise<GetArtistRoyaltySettingsResponse> {
    const response = await fetch(`${this.baseUrl}/artists`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error || "작가 로열티 설정 목록을 가져오는데 실패했습니다."
      );
    }

    return response.json();
  }

  static async updateArtistRule(artistId: string, data: RoyaltyRuleInput) {
    const response = await fetch(`${this.baseUrl}/artists/${artistId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "작가 기본 로열티 저장에 실패했습니다.");
    }

    return response.json();
  }

  static async getArtistTemplates(
    artistId: string
  ): Promise<GetTemplateRoyaltySettingsResponse> {
    const response = await fetch(`${this.baseUrl}/artists/${artistId}/templates`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error || "템플릿 로열티 설정 목록을 가져오는데 실패했습니다."
      );
    }

    return response.json();
  }

  static async getTemplateRules(
    templateId: string
  ): Promise<GetTemplateProductRoyaltySettingsResponse> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "상품 로열티 설정을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async updateTemplateRule(
    templateId: string,
    data: RoyaltyRuleInput & { artistId: string }
  ) {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "템플릿 로열티 저장에 실패했습니다.");
    }

    return response.json();
  }
}
