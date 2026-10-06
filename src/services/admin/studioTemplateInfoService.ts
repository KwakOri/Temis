import { TemplateStudioService } from "@/services/templateStudioService";
import { AdminCatalogCoverService } from "./catalogCoverService";
import { AdminTemplateHubService } from "./templateHubService";

export type StudioTemplateInfoValues = {
  name: string;
  isPublic: boolean;
  thumbnailUrl: string | null;
};

export type StudioTemplateInfoInput = {
  name: string;
  isPublic: boolean;
  coverFile: File | null;
  removeCover: boolean;
};

// Existing metadata and file APIs commit independently. Keep successful values
// so a retry, including changing the classification back, uses the actual state.
export class StudioTemplateInfoSaveError extends Error {
  constructor(
    message: string,
    readonly savedValues: StudioTemplateInfoValues,
  ) {
    super(message);
    this.name = "StudioTemplateInfoSaveError";
  }
}

export const updateStudioTemplateInfo = async ({
  templateId,
  previous,
  input,
}: {
  templateId: string;
  previous: StudioTemplateInfoValues;
  input: StudioTemplateInfoInput;
}): Promise<StudioTemplateInfoValues> => {
  const saved = { ...previous };
  try {
    // The guarded classification API rejects selling -> personal before any
    // other fields change. It never stops a sale automatically.
    if (input.isPublic !== saved.isPublic) {
      const item = await AdminTemplateHubService.updateSalesType(
        templateId,
        input.isPublic ? "general" : "custom",
      );
      saved.isPublic = item.salesType === "general";
    }
    if (input.name !== saved.name) {
      const response = await TemplateStudioService.renameTemplate(templateId, {
        name: input.name,
      });
      saved.name = response.template.name;
    }
    if (input.coverFile) {
      const response = await AdminCatalogCoverService.upload(
        templateId,
        input.coverFile,
      );
      saved.thumbnailUrl = response.template.thumbnail_url || null;
    } else if (input.removeCover && saved.thumbnailUrl) {
      await AdminCatalogCoverService.remove(templateId);
      saved.thumbnailUrl = null;
    }
    return saved;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "정보를 저장하지 못했습니다.";
    const partiallySaved =
      saved.name !== previous.name || saved.isPublic !== previous.isPublic;
    throw new StudioTemplateInfoSaveError(
      partiallySaved
        ? `일부 변경은 저장되었습니다. ${message} 다시 저장해 주세요.`
        : message,
      saved,
    );
  }
};
