import { V2TemplateRenderConfig } from "@/types/time-table/template-render-config";

export interface V2TemplateRenderConfigResponse {
  success: boolean;
  templateId: string;
  source: "db" | "empty";
  configVersion: number;
  renderConfig: V2TemplateRenderConfig;
  createdAt: string | null;
  updatedAt: string | null;
  latestRevisionNo?: number | null;
}

export class V2TemplateRenderConfigService {
  static async getTemplateRenderConfig(
    templateId: string
  ): Promise<V2TemplateRenderConfigResponse> {
    const response = await fetch(`/api/v2/template-render-config/${templateId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "템플릿 렌더링 설정을 불러오는데 실패했습니다."
      );
    }

    return result as V2TemplateRenderConfigResponse;
  }
}
