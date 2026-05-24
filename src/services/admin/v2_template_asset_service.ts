export type V2TemplateAssetUploadTargetType = "builtin" | "extra";

export interface V2TemplateAssetUploadItem {
  clientId: string;
  file: File;
  targetType: V2TemplateAssetUploadTargetType;
  targetKey: string;
  theme: string;
}

export interface V2TemplateAssetUploadMapping {
  clientId: string;
  fileName: string;
  targetType: V2TemplateAssetUploadTargetType;
  targetKey: string;
  theme: string;
}

export interface V2TemplateAssetUploadRecord {
  clientId?: string;
  fileName?: string;
  targetType?: V2TemplateAssetUploadTargetType;
  targetKey?: string;
  theme?: string;
  url?: string;
  fileKey?: string;
}

export interface V2TemplateAssetUploadResponse {
  success?: boolean;
  uploaded?: V2TemplateAssetUploadRecord[];
  error?: string;
}

export class AdminV2TemplateAssetService {
  private static uploadUrl = "/api/admin/v2/templates/assets/upload";

  static async uploadTemplateAssets({
    templateId,
    items,
  }: {
    templateId: string;
    items: V2TemplateAssetUploadItem[];
  }): Promise<V2TemplateAssetUploadRecord[]> {
    if (items.length === 0) return [];

    const formData = new FormData();
    formData.append("templateId", templateId.trim() || "local");
    formData.append(
      "mappingJson",
      JSON.stringify(
        items.map(
          (item): V2TemplateAssetUploadMapping => ({
            clientId: item.clientId,
            fileName: item.file.name,
            targetType: item.targetType,
            targetKey: item.targetKey,
            theme: item.theme,
          })
        )
      )
    );
    items.forEach((item) => {
      formData.append("files", item.file);
    });

    const response = await fetch(this.uploadUrl, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as
      | V2TemplateAssetUploadResponse
      | null;

    if (!response.ok) {
      throw new Error(payload?.error || "에셋 업로드에 실패했습니다.");
    }

    return payload?.uploaded ?? [];
  }
}
