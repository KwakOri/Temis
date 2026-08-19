import type {
  TemplateStudioAssetRecord,
  TemplateStudioDocumentRecord,
  TemplateStudioDraftRecord,
  TemplateStudioTemplateRecord,
} from "@/services/server/templateStudioPersistenceService";
import type {
  StudioDiagnostic,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTemplateKind,
} from "@/types/template-studio";
import type {
  TemplateStudioDocumentSummary,
  TemplateStudioSaveOperation,
} from "@/utils/template-studio/save-audit";

export interface TemplateStudioTemplateListResponse {
  success: boolean;
  templates: TemplateStudioTemplateRecord[];
}

export interface TemplateStudioCreateTemplatePayload {
  name: string;
  description?: string;
  templateKind?: StudioTemplateKind;
  canvasPresetId?: string;
}

export interface TemplateStudioCreateTemplateResponse {
  success: boolean;
  template: TemplateStudioTemplateRecord;
}

export interface TemplateStudioTemplateDetailResponse {
  success: boolean;
  templateId: string;
  template: TemplateStudioTemplateRecord;
  document: TemplateStudioDocumentRecord | null;
  draft: TemplateStudioDraftRecord | null;
  assets: TemplateStudioAssetRecord[];
  latestRevisionNo: number;
  source: "draft" | "published" | "empty";
}

export interface TemplateStudioDraftResponse {
  success: boolean;
  templateId: string;
  hasDraft: boolean;
  draft: TemplateStudioDraftRecord | null;
}

export interface TemplateStudioSaveDraftPayload {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  baseRevisionNo?: number | null;
  isAutosave?: boolean;
  attemptId: string;
  operation: TemplateStudioSaveOperation;
}

export interface TemplateStudioSaveDraftResponse extends TemplateStudioDraftResponse {
  attemptId: string;
  diagnostics: StudioDiagnostic[];
  migrationWarnings: string[];
}

export interface TemplateStudioPublishPayload {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  deleteDraft?: boolean;
  attemptId: string;
  operation: TemplateStudioSaveOperation;
}

export interface TemplateStudioPublishResponse {
  success: boolean;
  templateId: string;
  attemptId: string;
  revisionNo: number;
  latestRevisionNo: number;
  document: TemplateStudioDocumentRecord;
  diagnostics: StudioDiagnostic[];
  migrationWarnings: string[];
}

export interface TemplateStudioUploadAssetPayload {
  assetId: string;
  label: string;
  src: string;
  localContentHash?: string;
  mimeType?: string;
  byteSize?: number;
}

export interface TemplateStudioUploadedAsset {
  id: string;
  label: string;
  src: string;
  storageProvider?: string;
  storagePath: string;
  publicUrl?: string;
  contentHash?: string;
  mimeType: string;
  byteSize: number;
  uploaded?: boolean;
  lastSyncedAt?: string | null;
}

export interface TemplateStudioUploadAssetsResponse {
  success: boolean;
  templateId: string;
  attemptId?: string;
  assets: TemplateStudioUploadedAsset[];
}

export interface TemplateStudioAssetSyncContext {
  attemptId: string;
  operation: TemplateStudioSaveOperation;
}

export interface TemplateStudioSaveEventPayload {
  attemptId: string;
  operation: TemplateStudioSaveOperation;
  errorMessage: string;
  diagnostics: StudioDiagnostic[];
  documentSummary: TemplateStudioDocumentSummary;
}

export interface TemplateStudioDeleteTemplateResponse {
  success: boolean;
  templateId: string;
}

export class TemplateStudioApiError extends Error {
  readonly attemptId: string | null;
  readonly diagnostics: StudioDiagnostic[];
  readonly status: number;

  constructor(input: {
    message: string;
    status: number;
    attemptId?: string | null;
    diagnostics?: StudioDiagnostic[];
  }) {
    super(input.message);
    this.name = "TemplateStudioApiError";
    this.status = input.status;
    this.attemptId = input.attemptId ?? null;
    this.diagnostics = input.diagnostics ?? [];
  }
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
    const attemptId =
      result &&
      typeof result === "object" &&
      "attemptId" in result &&
      typeof (result as { attemptId?: unknown }).attemptId === "string"
        ? (result as { attemptId: string }).attemptId
        : null;
    const diagnostics =
      result &&
      typeof result === "object" &&
      "diagnostics" in result &&
      Array.isArray((result as { diagnostics?: unknown }).diagnostics)
        ? ((result as { diagnostics: StudioDiagnostic[] }).diagnostics ?? [])
        : [];
    throw new TemplateStudioApiError({
      message: message || fallbackMessage,
      status: response.status,
      attemptId,
      diagnostics,
    });
  }

  return result as T;
};

export class TemplateStudioService {
  private static baseUrl = "/api/admin/template-studio/templates";

  static async listTemplates(
    templateKind?: StudioTemplateKind,
  ): Promise<TemplateStudioTemplateListResponse> {
    const query = templateKind ? `?kind=${templateKind}` : "";
    const response = await fetch(`${this.baseUrl}${query}`);
    return parseJsonResponse<TemplateStudioTemplateListResponse>(
      response,
      "Template Studio 템플릿 목록을 불러오는데 실패했습니다.",
    );
  }

  static async createTemplate(
    payload: TemplateStudioCreateTemplatePayload,
  ): Promise<TemplateStudioCreateTemplateResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<TemplateStudioCreateTemplateResponse>(
      response,
      "Template Studio 템플릿 생성에 실패했습니다.",
    );
  }

  static async getTemplate(
    templateId: string,
  ): Promise<TemplateStudioTemplateDetailResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}`);
    return parseJsonResponse<TemplateStudioTemplateDetailResponse>(
      response,
      "Template Studio 템플릿을 불러오는데 실패했습니다.",
    );
  }

  static async getDraft(
    templateId: string,
  ): Promise<TemplateStudioDraftResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}/draft`);
    return parseJsonResponse<TemplateStudioDraftResponse>(
      response,
      "Template Studio draft를 불러오는데 실패했습니다.",
    );
  }

  static async saveDraft(
    templateId: string,
    payload: TemplateStudioSaveDraftPayload,
  ): Promise<TemplateStudioSaveDraftResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}/draft`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<TemplateStudioSaveDraftResponse>(
      response,
      "Template Studio draft 저장에 실패했습니다.",
    );
  }

  static async publish(
    templateId: string,
    payload: TemplateStudioPublishPayload,
  ): Promise<TemplateStudioPublishResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<TemplateStudioPublishResponse>(
      response,
      "Template Studio 문서 발행에 실패했습니다.",
    );
  }

  static async uploadAssets(
    templateId: string,
    assets: TemplateStudioUploadAssetPayload[],
  ): Promise<TemplateStudioUploadAssetsResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}/assets/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assets }),
    });

    return parseJsonResponse<TemplateStudioUploadAssetsResponse>(
      response,
      "Template Studio asset 업로드에 실패했습니다.",
    );
  }

  static async syncAssets(
    templateId: string,
    assets: TemplateStudioUploadAssetPayload[],
    context: TemplateStudioAssetSyncContext,
  ): Promise<TemplateStudioUploadAssetsResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}/assets/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assets, ...context }),
    });

    return parseJsonResponse<TemplateStudioUploadAssetsResponse>(
      response,
      "Template Studio asset 동기화에 실패했습니다.",
    );
  }

  static async recordSaveEvent(
    templateId: string,
    payload: TemplateStudioSaveEventPayload,
  ): Promise<{ success: boolean; templateId: string; attemptId: string }> {
    const response = await fetch(`${this.baseUrl}/${templateId}/save-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse(
      response,
      "Template Studio 저장 오류 기록에 실패했습니다.",
    );
  }

  static async deleteTemplate(
    templateId: string,
  ): Promise<TemplateStudioDeleteTemplateResponse> {
    const response = await fetch(`${this.baseUrl}/${templateId}`, {
      method: "DELETE",
    });

    return parseJsonResponse<TemplateStudioDeleteTemplateResponse>(
      response,
      "Template Studio 템플릿 삭제에 실패했습니다.",
    );
  }
}
