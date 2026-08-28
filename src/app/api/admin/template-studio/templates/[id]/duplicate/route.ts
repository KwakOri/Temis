import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import { copyFileInR2, deleteFilesFromR2Prefix } from "@/lib/r2";
import {
  createTemplateStudioTemplate,
  deleteTemplateStudioTemplate,
  getTemplateStudioCurrentDocument,
  getTemplateStudioDraft,
  getTemplateStudioTemplate,
  listTemplateStudioAssetMetadata,
  listTemplateStudioTemplates,
  saveTemplateStudioDraft,
  upsertTemplateStudioAssetMetadata,
} from "@/services/server/templateStudioPersistenceService";
import type {
  StudioAsset,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  buildTemplateStudioAssetTemplatePrefix,
  sanitizeTemplateStudioPathSegment,
} from "@/utils/template-studio/asset-storage";
import { getStudioTemplateKind } from "@/utils/template-studio/template-kind";
import { NextRequest, NextResponse } from "next/server";

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const buildDuplicateName = (
  sourceName: string,
  existingNames: Set<string>,
): string => {
  const baseName = `${sourceName.trim()} 복사본`;
  if (!existingNames.has(baseName)) return baseName;

  let suffix = 2;
  while (existingNames.has(`${baseName} ${suffix}`)) {
    suffix += 1;
  }
  return `${baseName} ${suffix}`;
};

const buildDestinationFileName = (
  sourcePath: string,
  assetId: string,
): string => {
  const sourceFileName = sourcePath.split("/").pop()?.trim() || "";
  const extensionIndex = sourceFileName.lastIndexOf(".");
  const sourceStem =
    extensionIndex > 0
      ? sourceFileName.slice(0, extensionIndex)
      : sourceFileName;
  const sourceExtension =
    extensionIndex > 0 ? sourceFileName.slice(extensionIndex + 1) : "";
  const stem = sanitizeTemplateStudioPathSegment(sourceStem, assetId);
  const extension = sourceExtension
    ? `.${sanitizeTemplateStudioPathSegment(sourceExtension, "bin")}`
    : ".bin";

  return `${stem}${extension}`;
};

const buildDestinationAssetPath = ({
  templateId,
  assetId,
  sourcePath,
}: {
  templateId: string;
  assetId: string;
  sourcePath: string;
}): string =>
  `${buildTemplateStudioAssetTemplatePrefix(templateId)}/assets/${sanitizeTemplateStudioPathSegment(
    assetId,
    "asset",
  )}/${buildDestinationFileName(sourcePath, assetId)}`;

const duplicateableDocument = (
  document: StudioTemplateDocument,
  name: string,
  description: string,
): StudioTemplateDocument => {
  const clonedDocument = cloneJson(document);
  clonedDocument.metadata = {
    ...clonedDocument.metadata,
    name,
    description,
  };
  return clonedDocument;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  try {
    const sourceTemplateId = await parseTemplateStudioTemplateId({ params });
    if (!sourceTemplateId) {
      return templateStudioBadTemplateIdResponse();
    }

    const sourceTemplate = await getTemplateStudioTemplate(sourceTemplateId);
    if (!sourceTemplate) {
      return templateStudioTemplateNotFoundResponse();
    }

    const [currentDocument, draft, sourceAssets, templates] = await Promise.all(
      [
        getTemplateStudioCurrentDocument(sourceTemplateId),
        getTemplateStudioDraft(sourceTemplateId, actor.userId),
        listTemplateStudioAssetMetadata(sourceTemplateId),
        listTemplateStudioTemplates(undefined, {
          templateKind: sourceTemplate.templateKind,
        }),
      ],
    );

    const sourceDocument = draft?.document ?? currentDocument?.document ?? null;
    const sourceRuntimeValues =
      draft?.runtimeValues ?? currentDocument?.runtimeValues ?? null;

    if (!sourceDocument || !sourceRuntimeValues) {
      return NextResponse.json(
        { error: "복제할 Template Studio 문서가 없습니다." },
        { status: 422 },
      );
    }

    if (getStudioTemplateKind(sourceDocument) !== sourceTemplate.templateKind) {
      return NextResponse.json(
        { error: "Template Studio document kind does not match the template." },
        { status: 422 },
      );
    }

    const duplicateName = buildDuplicateName(
      sourceTemplate.name,
      new Set(templates.map((template) => template.name)),
    );
    const clonedDocument = duplicateableDocument(
      sourceDocument,
      duplicateName,
      sourceTemplate.description,
    );
    const sourceAssetsById = new Map(
      sourceAssets.map((asset) => [asset.assetId, asset]),
    );

    const duplicate = await createTemplateStudioTemplate({
      name: duplicateName,
      description: sourceTemplate.description,
      status: "draft",
      createdBy: actor.userId,
      templateKind: sourceTemplate.templateKind,
      initialDocument: clonedDocument,
      initialRuntimeValues: sourceRuntimeValues,
    });

    let copiedAssetCount = 0;

    try {
      for (const [assetId, asset] of Object.entries(clonedDocument.assets) as [
        string,
        StudioAsset,
      ][]) {
        const registeredAsset = sourceAssetsById.get(assetId);
        const storageProvider =
          asset.storageProvider ?? registeredAsset?.storageProvider ?? null;
        const sourcePath =
          asset.storagePath ?? registeredAsset?.storagePath ?? "";

        if (storageProvider !== "r2") {
          // Data URLs and externally managed URLs remain embedded in the clone.
          // The next normal asset sync will materialize data URLs under the new
          // template prefix if the document is saved.
          continue;
        }

        if (!sourcePath) {
          throw new Error(`R2 asset ${assetId} has no source storage path.`);
        }

        const destinationPath = buildDestinationAssetPath({
          templateId: duplicate.id,
          assetId,
          sourcePath,
        });
        const copied = await copyFileInR2(sourcePath, destinationPath);

        const contentHash =
          asset.contentHash ?? registeredAsset?.contentHash ?? null;
        const mimeType =
          asset.mimeType ??
          registeredAsset?.mimeType ??
          "application/octet-stream";
        const width = asset.width ?? registeredAsset?.width ?? null;
        const height = asset.height ?? registeredAsset?.height ?? null;
        const byteSize = asset.byteSize ?? registeredAsset?.byteSize ?? null;

        await upsertTemplateStudioAssetMetadata({
          templateId: duplicate.id,
          assetId,
          storageProvider: "r2",
          storagePath: copied.fileKey,
          publicUrl: copied.url,
          contentHash,
          mimeType,
          width,
          height,
          byteSize,
          createdBy: actor.userId,
          lastSyncedAt: new Date().toISOString(),
        });

        clonedDocument.assets[assetId] = {
          ...asset,
          src: copied.url,
          storageProvider: "r2",
          storagePath: copied.fileKey,
          publicUrl: copied.url,
          ...(contentHash ? { contentHash } : {}),
          ...(width !== null ? { width } : {}),
          ...(height !== null ? { height } : {}),
          ...(byteSize !== null ? { byteSize } : {}),
          mimeType,
        };
        copiedAssetCount += 1;
      }

      await saveTemplateStudioDraft({
        templateId: duplicate.id,
        userId: actor.userId,
        document: clonedDocument,
        runtimeValues: sourceRuntimeValues,
        isAutosave: false,
        templateKind: sourceTemplate.templateKind,
      });
    } catch (error) {
      await deleteFilesFromR2Prefix(
        buildTemplateStudioAssetTemplatePrefix(duplicate.id),
      ).catch((cleanupError) => {
        console.error(
          `Template Studio duplicate R2 cleanup failed for ${duplicate.id}:`,
          cleanupError,
        );
      });
      await deleteTemplateStudioTemplate(duplicate.id).catch((cleanupError) => {
        console.error(
          `Template Studio duplicate DB cleanup failed for ${duplicate.id}:`,
          cleanupError,
        );
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      sourceTemplateId,
      template: duplicate,
      copiedAssetCount,
    });
  } catch (error) {
    console.error("Template Studio template duplicate error:", error);
    return NextResponse.json(
      { error: "Template Studio 템플릿 복제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
