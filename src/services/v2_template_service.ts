export type V2TemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type V2TemplateListResponse = {
  success: boolean;
  templates: V2TemplateListItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

const v2_isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export class V2TemplateService {
  static async getTemplates(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<V2TemplateListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));
    if (params?.search) queryParams.set("search", params.search);

    const suffix = queryParams.toString();
    const url = `/api/v2/templates${suffix ? `?${suffix}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const result: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const errorValue = v2_isRecord(result) ? result["error"] : undefined;
      const errorMessage =
        typeof errorValue === "string"
          ? errorValue
          : "v2 템플릿 목록 조회에 실패했습니다.";
      throw new Error(errorMessage);
    }

    return result as V2TemplateListResponse;
  }
}
