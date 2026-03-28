import { AdminSalesStatsResponse } from "@/types/admin";

export class AdminSalesService {
  private static baseUrl = "/api/admin/sales-stats";

  static async getSalesStats(params?: {
    from?: string;
    to?: string;
  }): Promise<AdminSalesStatsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);

    const url = `${this.baseUrl}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "매출 통계를 가져오는데 실패했습니다.");
    }

    return response.json();
  }
}

