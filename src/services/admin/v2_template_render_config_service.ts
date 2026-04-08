import { V2TemplateRenderConfig } from "@/types/time-table/template-render-config";
import { V2TemplateRenderConfigResponse } from "@/services/v2_template_render_config_service";

export interface V2UpdateTemplateRenderConfigPayload {
  configVersion?: number;
  renderConfig: V2TemplateRenderConfig;
}

export class AdminV2TemplateRenderConfigService {
  private static baseUrl = "/api/admin/v2/templates";

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
}
