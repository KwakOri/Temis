import { ShopTemplatesResponse, SortOrder, ShopTemplate } from "@/types/shop";

export class ShopService {
  static async getPublicTemplates(
    sortOrder: SortOrder = "newest"
  ): Promise<ShopTemplate[]> {
    const response = await fetch(
      `/api/shop/templates?sort=${encodeURIComponent(sortOrder)}`
    );
    const result = (await response.json().catch(() => null)) as
      | (ShopTemplatesResponse & { error?: string })
      | null;

    if (!response.ok) {
      throw new Error(
        result?.error || "템플릿을 가져오는데 실패했습니다."
      );
    }

    return result?.shopTemplates ?? [];
  }

  static async getUserTemplateAccess(): Promise<string[]> {
    const response = await fetch("/api/user/template-access", {
      credentials: "include",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.error || "접근 권한을 가져오는데 실패했습니다.");
    }

    return result?.templateIds ?? [];
  }
}
