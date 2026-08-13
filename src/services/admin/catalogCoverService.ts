export interface CatalogCoverMutationResponse {
  template: {
    id: string;
    thumbnail_url: string;
  };
  cleanupWarning?: boolean;
}

const parseError = async (response: Response): Promise<Error> => {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(body?.error || "대표 이미지 처리에 실패했습니다.");
};

export class AdminCatalogCoverService {
  private static baseUrl = "/api/admin/templates";

  static async upload(
    templateId: string,
    file: File,
  ): Promise<CatalogCoverMutationResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(templateId)}/catalog-cover`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) throw await parseError(response);
    return response.json();
  }

  static async remove(
    templateId: string,
  ): Promise<CatalogCoverMutationResponse> {
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(templateId)}/catalog-cover`,
      { method: "DELETE" },
    );

    if (!response.ok) throw await parseError(response);
    return response.json();
  }
}
