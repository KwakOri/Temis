import { createHash } from "crypto";
import { deleteFilesFromR2, uploadFileToR2Key } from "@/lib/r2";
import {
  buildTemplateStudioAssetKey,
  getTemplateStudioAssetExtension,
} from "@/utils/template-studio/asset-storage";
import { createStudioId } from "@/utils/template-studio/id";
import {
  createFigmaGridAnalyzeHandler,
} from "@/services/server/figmaGridAnalyzeHandler";
import {
  createFigmaFrameCandidate,
  exportFigmaNodeAsBytes,
  fetchFigmaGridNode,
} from "@/services/server/figmaTemplateStudioService";
import {
  deleteTemplateStudioAssetMetadata,
  getTemplateStudioTemplate,
  upsertTemplateStudioAssetMetadata,
} from "@/services/server/templateStudioPersistenceService";
import type {
  StudioAsset,
} from "@/types/template-studio";
import type {
  StudioFigmaAnalyzeResponse,
  StudioFigmaFrameImportLayer,
  StudioFigmaFrameImportPayload,
  StudioFigmaGridOriginCandidate,
} from "@/types/template-studio-figma";
import { parseFigmaDesignUrl } from "@/utils/template-studio/figma-import/figma-url";
import { NextRequest, NextResponse } from "next/server";

type AdminActorResult =
  | { ok: true; userId: number }
  | { ok: false; response: Response };

type PendingAsset = {
  asset: StudioAsset;
  createdBy: number;
};

const MAX_FRAME_ASSETS = 64;
const MAX_FRAME_ASSET_BYTES = 50 * 1024 * 1024;
const MAX_FRAME_TOTAL_BYTES = 60 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:(image\/(?:png|jpeg|gif|webp|svg\+xml));base64,([a-z0-9+/=\s]+)$/i;

const cleanLabel = (value: string): string =>
  value.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, 160) || "Figma image";

const findNode = (
  root: Awaited<ReturnType<typeof fetchFigmaGridNode>>["node"],
  nodeId: string,
): typeof root | undefined => {
  if (root.id === nodeId) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return undefined;
};

const isGridCandidate = (
  candidate: StudioFigmaAnalyzeResponse["candidates"][number],
): candidate is StudioFigmaGridOriginCandidate => "variants" in candidate;

export const createFigmaFrameImportHandler = (dependencies: {
  requireActor: (request: NextRequest) => Promise<AdminActorResult>;
}) => async (request: Pick<Request, "json">): Promise<Response> => {
  const actor = await dependencies.requireActor(request as NextRequest);
  if (!actor.ok) return actor.response;

  const uploadedKeys: string[] = [];
  const persistedAssetIds: string[] = [];
  let templateId = "";
  try {
    const body = await request.json().catch(() => null);
    const figmaUrl =
      body && typeof body === "object" && typeof body.figmaUrl === "string"
        ? body.figmaUrl.trim()
        : "";
    templateId =
      body && typeof body === "object" && typeof body.templateId === "string"
        ? body.templateId.trim()
        : "";
    if (!figmaUrl || !templateId) {
      return NextResponse.json(
        { error: "Figma 링크와 저장 대상 템플릿이 필요합니다." },
        { status: 400 },
      );
    }
    const template = await getTemplateStudioTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template Studio 템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    const source = parseFigmaDesignUrl(figmaUrl);
    if (!source) {
      return NextResponse.json(
        { error: "유효한 Figma 디자인 링크가 필요합니다." },
        { status: 400 },
      );
    }

    const { node: frameNode } = await fetchFigmaGridNode(source);
    const frameCandidate = createFigmaFrameCandidate(frameNode);
    const pendingAssets: PendingAsset[] = [];
    let importedByteSize = 0;
    const registerBytes = async (
      asset: StudioAsset,
      sourceBytes: Uint8Array,
      sourceMimeType: string,
    ): Promise<StudioAsset> => {
      if (pendingAssets.length >= MAX_FRAME_ASSETS) {
        throw new Error("The Figma frame contains too many image assets.");
      }
      const bytes = Buffer.from(sourceBytes);
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_FRAME_ASSET_BYTES) {
        throw new Error(`Figma image exceeds the 50 MiB asset limit: ${cleanLabel(asset.label)}.`);
      }
      importedByteSize += bytes.byteLength;
      if (importedByteSize > MAX_FRAME_TOTAL_BYTES) {
        throw new Error("The Figma frame exceeds the 60 MiB total image limit.");
      }
      const mimeType = sourceMimeType.toLowerCase();
      const extension = getTemplateStudioAssetExtension(mimeType);
      if (!extension) throw new Error(`Unsupported Figma image type: ${mimeType}.`);
      const contentHash = createHash("sha256").update(bytes).digest("hex");
      const storagePath = buildTemplateStudioAssetKey({
        templateId,
        assetId: asset.id,
        contentHash,
        extension,
      });
      const uploaded = await uploadFileToR2Key(bytes, storagePath, mimeType);
      uploadedKeys.push(storagePath);
      const remoteAsset: StudioAsset = {
        ...asset,
        label: cleanLabel(asset.label),
        src: uploaded.url,
        storageProvider: "r2",
        storagePath,
        publicUrl: uploaded.url,
        contentHash,
        mimeType,
        byteSize: bytes.byteLength,
        lastSyncedAt: new Date().toISOString(),
      };
      pendingAssets.push({ asset: remoteAsset, createdBy: actor.userId });
      return remoteAsset;
    };
    const registerAsset = async (asset: StudioAsset): Promise<StudioAsset> => {
      const match = asset.src.match(DATA_IMAGE_PATTERN);
      if (!match || match[1].toLowerCase() !== asset.mimeType?.toLowerCase()) {
        throw new Error(`Unsupported Figma image data for ${cleanLabel(asset.label)}.`);
      }
      return registerBytes(
        asset,
        Buffer.from(match[2].replace(/\s+/g, ""), "base64"),
        match[1],
      );
    };

    const layers: StudioFigmaFrameImportLayer[] = [];
    for (const summary of frameCandidate.layers) {
      const nodeToExport = findNode(frameNode, summary.sourceNodeId);
      if (!nodeToExport) continue;
      const exported = await exportFigmaNodeAsBytes(
        source.fileKey,
        summary.sourceNodeId,
        "png",
      );
      const asset = await registerBytes({
        id: createStudioId("figma_asset"),
        label: cleanLabel(summary.label),
        src: "",
        mimeType: exported.mimeType,
        byteSize: exported.byteSize,
        width: summary.bounds.width,
        height: summary.bounds.height,
      }, exported.bytes, exported.mimeType);
      layers.push({ ...summary, asset });
    }

    let gridCandidates: StudioFigmaGridOriginCandidate[] = [];
    const warnings = [...frameCandidate.warnings];
    if (frameCandidate.grid) {
      const gridUrl = new URL(figmaUrl);
      gridUrl.searchParams.set(
        "node-id",
        frameCandidate.grid.sourceNodeId.replace(":", "-"),
      );
      const analyzeGrid = createFigmaGridAnalyzeHandler({
        requireActor: async () => ({ ok: true, userId: actor.userId }),
      });
      const gridResponse = await analyzeGrid({
        json: async () => ({ figmaUrl: gridUrl.toString() }),
      });
      const gridBody = await gridResponse.json().catch(() => null);
      if (!gridResponse.ok) {
        const message =
          gridBody && typeof gridBody === "object" && "error" in gridBody
            ? String(gridBody.error)
            : "Figma GRID analysis failed.";
        throw new Error(message);
      }
      const analysis = gridBody as StudioFigmaAnalyzeResponse;
      gridCandidates = analysis.candidates.filter(isGridCandidate);
      warnings.push(...analysis.warnings);
      for (const candidate of gridCandidates) {
        for (const status of ["online", "offline"] as const) {
          const componentAssets = candidate.variants[status].component.assets;
          for (let index = 0; index < componentAssets.length; index += 1) {
            componentAssets[index] = await registerAsset(componentAssets[index]!);
          }
        }
        // The analysis response keeps a compatibility projection beside the
        // authoritative variants. Point it at the uploaded online graph too,
        // so no transient data URL survives in the frame-import response.
        candidate.component = candidate.variants.online.component;
        candidate.reviews = candidate.variants.online.reviews;
        candidate.reviewNodeIds = candidate.variants.online.reviewNodeIds;
        candidate.reviewDefaults = candidate.variants.online.reviewDefaults;
      }
    }

    for (const { asset, createdBy } of pendingAssets) {
      await upsertTemplateStudioAssetMetadata({
        templateId,
        assetId: asset.id,
        storageProvider: "r2",
        storagePath: asset.storagePath!,
        publicUrl: asset.publicUrl,
        contentHash: asset.contentHash,
        mimeType: asset.mimeType!,
        width: asset.width,
        height: asset.height,
        byteSize: asset.byteSize,
        createdBy,
        lastSyncedAt: asset.lastSyncedAt,
      });
      persistedAssetIds.push(asset.id);
    }

    const payload: StudioFigmaFrameImportPayload = {
      candidateId: frameCandidate.candidateId,
      label: frameCandidate.label,
      frame: frameCandidate.frame,
      layers,
      grid: frameCandidate.grid,
      gridCandidates,
      warnings: [...new Set(warnings)],
    };
    return NextResponse.json({ success: true, payload });
  } catch (error) {
    await Promise.all(
      persistedAssetIds.map((assetId) =>
        deleteTemplateStudioAssetMetadata(templateId, assetId).catch(() => null),
      ),
    );
    await deleteFilesFromR2(uploadedKeys).catch(() => null);
    const message = error instanceof Error ? error.message : "Figma frame import failed.";
    const isInputError =
      message.includes("maximum size") ||
      message.includes("50 MiB") ||
      message.includes("60 MiB") ||
      message.includes("too many image assets") ||
      message.includes("Unsupported Figma image");
    return NextResponse.json(
      { error: isInputError ? message : "Figma frame import failed." },
      { status: isInputError ? 413 : 502 },
    );
  }
};
