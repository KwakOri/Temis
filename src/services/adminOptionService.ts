import { AdminOption } from "@/types/adminOption";

const API_BASE = "/api/admin-options";

// 공개용 관리자 옵션 서비스 (활성화된 옵션만 조회)
export class PublicAdminOptionService {
  // 활성화된 관리자 옵션 조회 (카테고리별 필터링 가능)
  static async getEnabledOptions(category?: string): Promise<AdminOption[]> {
    const params = new URLSearchParams();
    if (category) {
      params.set("category", category);
    }

    const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "관리자 옵션 조회에 실패했습니다.");
    }

    const data = await response.json();
    return data.options;
  }

  // 특정 옵션이 활성화되어 있는지 확인
  static async isOptionEnabled(value: string): Promise<boolean> {
    try {
      const options = await this.getEnabledOptions();
      return options.some((opt) => opt.value === value);
    } catch {
      return false;
    }
  }
}
