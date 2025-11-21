import {
  CreatePriceOptionInput,
  PriceOption,
  PriceOptionsResponse,
  UpdatePriceOptionInput,
} from "@/types/priceOption";

export class PriceOptionService {
  private static baseUrl = "/api/admin/price-options";

  // 모든 가격 옵션 조회
  static async getAll(category?: string): Promise<PriceOption[]> {
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

  // 특정 가격 옵션 조회
  static async getById(id: string): Promise<PriceOption> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "가격 옵션 조회에 실패했습니다.");
    }

    const result = await response.json();
    return result.option;
  }

  // 새 가격 옵션 생성
  static async create(input: CreatePriceOptionInput): Promise<PriceOption> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "가격 옵션 생성에 실패했습니다.");
    }

    const result = await response.json();
    return result.option;
  }

  // 가격 옵션 수정
  static async update(
    id: string,
    input: UpdatePriceOptionInput
  ): Promise<PriceOption> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "가격 옵션 수정에 실패했습니다.");
    }

    const result = await response.json();
    return result.option;
  }

  // 가격 옵션 삭제
  static async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "가격 옵션 삭제에 실패했습니다.");
    }
  }
}
