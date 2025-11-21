import { PriceOption, PriceOptionsResponse } from "@/types/priceOption";

export class PublicPriceOptionService {
  private static baseUrl = "/api/price-options";

  // 활성화된 가격 옵션 조회 (카테고리별 필터링 가능)
  static async getEnabledOptions(category?: string): Promise<PriceOption[]> {
    const url = new URL(this.baseUrl, window.location.origin);
    if (category) {
      url.searchParams.set("category", category);
    }

    const response = await fetch(url.toString(), {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "가격 옵션 조회에 실패했습니다.");
    }

    const result: PriceOptionsResponse = await response.json();
    return result.options;
  }
}
