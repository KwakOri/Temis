import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";

export interface TemplateStudioPreviewTemplate {
  id: string;
  name: string;
  description: string;
  status: "published";
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStudioPublishedPreviewResponse {
  success: boolean;
  templateId: string;
  source: "published";
  template: TemplateStudioPreviewTemplate;
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  publishedRevisionNo: number | null;
  createdAt: string;
  updatedAt: string;
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

export class TemplateStudioPreviewService {
  static async getPublishedPreview(
    templateId: string,
  ): Promise<TemplateStudioPublishedPreviewResponse> {
    const response = await fetch(
      `/api/template-studio/templates/${templateId}/preview`,
    );

    return parseJsonResponse<TemplateStudioPublishedPreviewResponse>(
      response,
      "Template Studio 미리보기를 불러오는데 실패했습니다.",
    );
  }
}
