import type { StudioDiagnostic, StudioRuntimeValues, StudioTemplateDocument } from "@/types/template-studio";

export interface TemplateStudioRuntimeResponse {
  template: { id: string; name: string };
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  baseRevisionNo: number | null;
  hasSavedState: boolean;
}

export interface TemplateStudioSaveRuntimeResponse {
  runtimeValues: StudioRuntimeValues;
  baseRevisionNo: number | null;
  updatedAt: string;
}

export interface TemplateStudioRuntimeValidationError {
  error: string;
  diagnostics?: StudioDiagnostic[];
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

export class TemplateStudioRuntimeService {
  private static baseUrl = "/api/user/templates";

  static async getRuntime(
    templateId: string,
  ): Promise<TemplateStudioRuntimeResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}/runtime`);
    return parseJsonResponse<TemplateStudioRuntimeResponse>(
      response,
      "저장된 값을 불러오는데 실패했습니다.",
    );
  }

  static async saveRuntime(
    templateId: string,
    runtimeValues: StudioRuntimeValues,
  ): Promise<TemplateStudioSaveRuntimeResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}/runtime`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ runtimeValues }),
    });

    return parseJsonResponse<TemplateStudioSaveRuntimeResponse>(
      response,
      "저장에 실패했습니다.",
    );
  }
}
