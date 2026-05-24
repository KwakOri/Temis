import { V2TemplateRenderConfig } from "@/types/time-table/template-render-config";
import { V2TemplateRenderConfigResponse } from "@/services/v2_template_render_config_service";

export interface V2UpdateTemplateRenderConfigPayload {
  configVersion?: number;
  renderConfig: V2TemplateRenderConfig;
}

export interface V2CreateAdminTemplatePayload {
  name: string;
  description: string;
  is_public?: boolean;
}

export interface V2CreateAdminTemplateResponse {
  success: boolean;
  template: {
    id: string;
    name?: string;
    description?: string;
    is_public?: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

export interface V2TemplateRenderConfigDraftResponse {
  success: boolean;
  templateId: string;
  hasDraft: boolean;
  draft: {
    id: string;
    configVersion: number;
    renderConfig: V2TemplateRenderConfig;
    baseRevisionNo: number | null;
    isAutosave: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface V2UpdateTemplateRenderConfigDraftPayload {
  configVersion?: number;
  renderConfig: V2TemplateRenderConfig;
  baseRevisionNo?: number | null;
  isAutosave?: boolean;
}

export interface V2PublishTemplateRenderConfigPayload {
  configVersion?: number;
  renderConfig: V2TemplateRenderConfig;
}

export interface V2PublishTemplateRenderConfigResponse {
  success: boolean;
  templateId: string;
  revisionNo: number;
  configVersion: number;
  renderConfig: V2TemplateRenderConfig;
  createdAt: string;
  updatedAt: string;
  latestRevisionNo: number;
}

export class AdminV2TemplateRenderConfigService {
  private static baseUrl = "/api/admin/v2/templates";

  static async createTemplate(
    payload: V2CreateAdminTemplatePayload
  ): Promise<V2CreateAdminTemplateResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || "템플릿 생성에 실패했습니다.");
    }

    return result as V2CreateAdminTemplateResponse;
  }

  static async getTemplateRenderConfig(
    templateId: string
  ): Promise<V2TemplateRenderConfigResponse> {
    const response = await fetch(
      `${this.baseUrl}/${templateId}/render-config`
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "템플릿 렌더링 설정을 불러오는데 실패했습니다."
      );
    }

    return result as V2TemplateRenderConfigResponse;
  }

  static async updateTemplateRenderConfig(
    templateId: string,
    payload: V2UpdateTemplateRenderConfigPayload
  ): Promise<V2TemplateRenderConfigResponse> {
    const response = await fetch(
      `${this.baseUrl}/${templateId}/render-config`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "템플릿 렌더링 설정 저장에 실패했습니다."
      );
    }

    return result as V2TemplateRenderConfigResponse;
  }

  static async getTemplateRenderConfigDraft(
    templateId: string
  ): Promise<V2TemplateRenderConfigDraftResponse> {
    const response = await fetch(
      `${this.baseUrl}/${templateId}/render-config/draft`
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "템플릿 렌더링 draft를 불러오는데 실패했습니다."
      );
    }

    return result as V2TemplateRenderConfigDraftResponse;
  }

  static async updateTemplateRenderConfigDraft(
    templateId: string,
    payload: V2UpdateTemplateRenderConfigDraftPayload
  ): Promise<V2TemplateRenderConfigDraftResponse> {
    const response = await fetch(
      `${this.baseUrl}/${templateId}/render-config/draft`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "템플릿 렌더링 draft 저장에 실패했습니다."
      );
    }

    return result as V2TemplateRenderConfigDraftResponse;
  }

  static async publishTemplateRenderConfig(
    templateId: string,
    payload: V2PublishTemplateRenderConfigPayload
  ): Promise<V2PublishTemplateRenderConfigResponse> {
    const response = await fetch(
      `${this.baseUrl}/${templateId}/render-config/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "템플릿 렌더링 설정 발행에 실패했습니다."
      );
    }

    return result as V2PublishTemplateRenderConfigResponse;
  }
}
