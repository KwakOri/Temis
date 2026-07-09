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
} from "@/types/template-studio";

export interface TemplateStudioTemplateListResponse {
  success: boolean;
  templates: TemplateStudioTemplateRecord[];
}

export interface TemplateStudioCreateTemplatePayload {
  name: string;
  description?: string;
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
}

export interface TemplateStudioSaveDraftResponse
  extends TemplateStudioDraftResponse {
  diagnostics: StudioDiagnostic[];
  migrationWarnings: string[];
}

export interface TemplateStudioPublishPayload {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  deleteDraft?: boolean;
}

export interface TemplateStudioPublishResponse {
  success: boolean;
  templateId: string;
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
  assets: TemplateStudioUploadedAsset[];
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

export class TemplateStudioService {
  private static baseUrl = "/api/admin/template-studio/templates";

  static async listTemplates(): Promise<TemplateStudioTemplateListResponse> {
    const response = await fetch(this.baseUrl);
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

  static async getDraft(templateId: string): Promise<TemplateStudioDraftResponse> {
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
      "Template Studio asset 동기화에 실패했습니다.",
    );
  }
}
