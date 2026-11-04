export interface CatalogCoverMutationResponse {
  template: {
    id: string;
    thumbnail_url: string;
  };
  cleanupWarning?: boolean;
}

interface CatalogCoverPresignResponse {
  uploadUrl: string;
  token: string;
  headers: Record<string, string>;
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
    const coverUrl = `${this.baseUrl}/${encodeURIComponent(templateId)}/catalog-cover`;

    // Vercel 함수의 요청 본문 한도(4.5MB)를 넘는 이미지도 올릴 수 있도록
    // 파일은 R2에 직접 올리고 API에는 메타데이터와 완료 토큰만 보낸다.
    const presignResponse = await fetch(`${coverUrl}/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
      }),
    });

    if (!presignResponse.ok) throw await parseError(presignResponse);
    const upload: CatalogCoverPresignResponse = await presignResponse.json();

    const uploadResponse = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.headers,
      body: file,
    }).catch(() => null);

    if (!uploadResponse?.ok) {
      throw new Error("대표 이미지 파일 업로드에 실패했습니다.");
    }

    const response = await fetch(coverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: upload.token }),
    });

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
