export interface TemplateStudioPreviewAssetUploadItem {
  clientId: string;
  source: string;
  file: File;
}

export interface TemplateStudioPreviewAssetUploadRecord {
  clientId: string;
  source: string;
  fileKey: string;
  url: string;
  mimeType: string;
  byteSize: number;
}

export interface TemplateStudioPreviewAssetUploadResponse {
  success: boolean;
  runId: string;
  previewId: string;
  uploaded: TemplateStudioPreviewAssetUploadRecord[];
}

export interface TemplateStudioPreviewAssetCleanupResponse {
  success: boolean;
  runId: string | null;
  previewId: string | null;
  deletedR2ObjectCount: number;
  deletedRegistryCount: number;
}

const parseJsonResponse = async <T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> => {
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? String((result as { error?: unknown }).error)
        : fallbackMessage;
    throw new Error(message || fallbackMessage);
  }

  return result as T;
};

export class TemplateStudioPreviewAssetService {
  private static baseUrl = "/api/admin/template-studio/preview-assets";

  static async uploadPreviewAssets({
    runId,
    previewId,
    items,
  }: {
    runId: string;
    previewId: string;
    items: TemplateStudioPreviewAssetUploadItem[];
  }): Promise<TemplateStudioPreviewAssetUploadResponse> {
    const formData = new FormData();

    formData.set("runId", runId);
    formData.set("previewId", previewId);
    formData.set(
      "mappingJson",
      JSON.stringify(
        items.map((item) => ({
          clientId: item.clientId,
          source: item.source,
        })),
      ),
    );

    items.forEach((item) => {
      formData.append("files", item.file, item.file.name);
    });

    const response = await fetch(this.baseUrl, {
      method: "POST",
      body: formData,
    });

    return parseJsonResponse<TemplateStudioPreviewAssetUploadResponse>(
      response,
      "Template Studio preview asset 업로드에 실패했습니다.",
    );
  }

  static async cleanupPreviewAssets({
    runId,
    previewId,
    expired,
    olderThanHours,
  }: {
    runId?: string;
    previewId?: string;
    expired?: boolean;
    olderThanHours?: number;
  }): Promise<TemplateStudioPreviewAssetCleanupResponse> {
    const searchParams = new URLSearchParams();

    if (runId) searchParams.set("runId", runId);
    if (previewId) searchParams.set("previewId", previewId);
    if (expired) searchParams.set("expired", "true");
    if (olderThanHours !== undefined) {
      searchParams.set("olderThanHours", String(olderThanHours));
    }

    const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`, {
      method: "DELETE",
    });

    return parseJsonResponse<TemplateStudioPreviewAssetCleanupResponse>(
      response,
      "Template Studio preview asset 삭제에 실패했습니다.",
    );
  }
}
