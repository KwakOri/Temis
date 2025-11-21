import {
  AdminOption,
  CreateAdminOptionInput,
  UpdateAdminOptionInput,
} from "@/types/adminOption";

const API_BASE = "/api/admin/admin-options";

export class AdminOptionService {
  // 모든 관리자 옵션 조회 (카테고리별 필터링 가능)
  static async getOptions(category?: string): Promise<AdminOption[]> {
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

  // 새 관리자 옵션 생성
  static async createOption(input: CreateAdminOptionInput): Promise<AdminOption> {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "관리자 옵션 생성에 실패했습니다.");
    }

    const data = await response.json();
    return data.option;
  }

  // 관리자 옵션 수정
  static async updateOption(
    id: string,
    input: UpdateAdminOptionInput
  ): Promise<AdminOption> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "관리자 옵션 수정에 실패했습니다.");
    }

    const data = await response.json();
    return data.option;
  }

  // 관리자 옵션 삭제
  static async deleteOption(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "관리자 옵션 삭제에 실패했습니다.");
    }
  }

  // 관리자 옵션 활성화/비활성화 토글
  static async toggleOption(
    id: string,
    isEnabled: boolean
  ): Promise<AdminOption> {
    return this.updateOption(id, { is_enabled: isEnabled });
  }
}
