import type {
  FigmaGridCandidateSource,
  FigmaNormalizedNode,
  FigmaNodeResponse,
  FigmaTransientAsset,
} from "@/types/template-studio-figma";
import {
  groupFigmaGridPlacements,
  inferFigmaGridOriginVariantStatus,
  inferFigmaGridVariantStatus,
  resolveFigmaOriginComponent,
} from "@/utils/template-studio/figma-import/figma-origin";
import { normalizeFigmaRotation } from "@/utils/template-studio/figma-import/figma-rotation";
import { classifyFigmaTextNode } from "@/utils/template-studio/figma-import/figma-text-classifier";
import {
  inferFigmaSemanticEvidence,
  mapFigmaPlacementNodesToOrigin,
} from "@/utils/template-studio/figma-import/figma-placement-inference";
import { isFigmaVectorType } from "@/utils/template-studio/figma-import/figma-visual";

const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const MAX_FIGMA_ASSET_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_GRID_ROOT_TYPES = new Set(["FRAME", "COMPONENT", "INSTANCE"]);
const ALLOWED_CARD_TYPES = new Set([...ALLOWED_GRID_ROOT_TYPES, "GROUP"]);
const EXCLUDED_GRID_ROOTS = new Set([
  "profile",
  "topobject",
  "board",
  "weekdates",
  "background",
  "pagebackground",
]);

type FigmaRawNode = Record<string, unknown>;

export class FigmaGridScopeError extends Error {
  constructor() {
    super("The selected node is not a supported GRID component.");
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const normalizeLayerName = (value: string): string =>
  value
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const normalizeBounds = (value: unknown) => {
  const bounds = asRecord(value);
  const left = asNumber(bounds?.x);
  const top = asNumber(bounds?.y);
  const width = asNumber(bounds?.width);
  const height = asNumber(bounds?.height);
  return left === undefined ||
    top === undefined ||
    width === undefined ||
    height === undefined
    ? undefined
    : { left, top, width, height };
};

const normalizeRelativeTransform = (
  value: unknown,
): [[number, number, number], [number, number, number]] | undefined => {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const rows = value.map((row) =>
    Array.isArray(row) && row.length === 3 ? row.map(asNumber) : null,
  );
  if (
    !rows[0] || !rows[1] ||
    rows[0].some((entry) => entry === undefined) ||
    rows[1].some((entry) => entry === undefined)
  ) {
    return undefined;
  }
  return [
    rows[0] as [number, number, number],
    rows[1] as [number, number, number],
  ];
};

export const normalizeFigmaNode = (raw: FigmaRawNode): FigmaNormalizedNode => {
  const absoluteBounds = normalizeBounds(raw.absoluteBoundingBox);
  const absoluteRenderBounds = normalizeBounds(raw.absoluteRenderBounds);
  const style = asRecord(raw.style);
  const rotateDeg = normalizeFigmaRotation(asNumber(raw.rotation));
  const size = asRecord(raw.size);
  const width = asNumber(size?.x);
  const height = asNumber(size?.y);
  const children = Array.isArray(raw.children)
    ? raw.children
        .map(asRecord)
        .filter((child): child is FigmaRawNode => child !== null)
        .map(normalizeFigmaNode)
    : undefined;

  return {
    id: asString(raw.id) ?? "",
    name: asString(raw.name) ?? "Untitled layer",
    type: asString(raw.type) ?? "UNKNOWN",
    characters: asString(raw.characters),
    textAutoResize: asString(style?.textAutoResize) ?? asString(raw.textAutoResize),
    layoutSizingHorizontal: asString(raw.layoutSizingHorizontal),
    layoutSizingVertical: asString(raw.layoutSizingVertical),
    layoutMode: asString(raw.layoutMode),
    textAlignHorizontal: asString(style?.textAlignHorizontal),
    textAlignVertical: asString(style?.textAlignVertical),
    visible: typeof raw.visible === "boolean" ? raw.visible : undefined,
    opacity: asNumber(raw.opacity),
    fills: Array.isArray(raw.fills) ? raw.fills : undefined,
    effects: Array.isArray(raw.effects) ? raw.effects : undefined,
    strokes: Array.isArray(raw.strokes) ? raw.strokes : undefined,
    cornerRadius: asNumber(raw.cornerRadius),
    clipsContent: typeof raw.clipsContent === "boolean" ? raw.clipsContent : undefined,
    absoluteBounds,
    absoluteRenderBounds,
    style: style ?? undefined,
    rotateDeg,
    localSize: width !== undefined && height !== undefined ? { width, height } : undefined,
    relativeTransform: normalizeRelativeTransform(raw.relativeTransform),
    componentId: asString(raw.componentId),
    componentProperties: asRecord(raw.componentProperties) ?? undefined,
    overrides: Array.isArray(raw.overrides)
      ? raw.overrides.map(asRecord).filter((override): override is Record<string, unknown> => override !== null)
      : undefined,
    children,
    frame: absoluteBounds,
  };
};

const getFigmaAccessToken = (): string => {
  const token = process.env.FIGMA_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("Figma access is not configured.");
  return token;
};

const figmaFetch = async (path: string): Promise<Response> => {
  const response = await fetch(`${FIGMA_API_BASE_URL}${path}`, {
    headers: { "X-Figma-Token": getFigmaAccessToken() },
  });
  if (!response.ok) throw new Error("Figma request failed.");
  return response;
};

const isDecorativeAssetNode = (node: FigmaNormalizedNode): boolean =>
  node.type === "IMAGE" ||
  node.type === "SLICE" ||
  isFigmaVectorType(node.type) ||
  node.fills?.some((fill) => asRecord(fill)?.type === "IMAGE") === true ||
  (node.type !== "TEXT" &&
    ((node.effects?.length ?? 0) > 0 || (node.strokes?.length ?? 0) > 0));

const collectDecorativeAssetNodes = (
  node: FigmaNormalizedNode,
): FigmaNormalizedNode[] => node.visible === false ? [] : [
  ...(isDecorativeAssetNode(node) ? [node] : []),
  ...(isFigmaVectorType(node.type) ? [] : node.children?.flatMap(collectDecorativeAssetNodes) ?? []),
];

const hasCardSemantics = (node: FigmaNormalizedNode): boolean => {
  if (node.visible === false) return false;
  if (node.type === "TEXT" && classifyFigmaTextNode({ name: node.name, characters: node.characters ?? "" }).role !== "unknown") return true;
  return node.children?.some(hasCardSemantics) === true;
};

const isGridCardRoot = (node: FigmaNormalizedNode): boolean =>
  node.visible !== false &&
  node.id.length > 0 &&
  ALLOWED_CARD_TYPES.has(node.type) &&
  !EXCLUDED_GRID_ROOTS.has(normalizeLayerName(node.name)) &&
  hasCardSemantics(node);

const isSupportedGridRoot = (node: FigmaNormalizedNode): boolean =>
  normalizeLayerName(node.name) === "grid" &&
  ALLOWED_GRID_ROOT_TYPES.has(node.type);

const readFigmaAssetBytes = async (response: Response): Promise<Uint8Array> => {
  const declaredSize = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredSize) &&
    declaredSize > MAX_FIGMA_ASSET_SIZE_BYTES
  ) {
    throw new Error("Figma asset exceeds the maximum size.");
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_FIGMA_ASSET_SIZE_BYTES) {
      throw new Error("Figma asset exceeds the maximum size.");
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteSize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteSize += value.byteLength;
      if (byteSize > MAX_FIGMA_ASSET_SIZE_BYTES) {
        await reader.cancel();
        throw new Error("Figma asset exceeds the maximum size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteSize);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

export const fetchFigmaGridNode = async (source: {
  fileKey: string;
  nodeId: string;
}): Promise<FigmaNodeResponse> => {
  const path = `/files/${encodeURIComponent(source.fileKey)}/nodes?ids=${encodeURIComponent(source.nodeId)}&geometry=paths`;
  const payload = asRecord(await (await figmaFetch(path)).json());
  const nodes = asRecord(payload?.nodes);
  const selected = asRecord(nodes?.[source.nodeId]);
  const document = asRecord(selected?.document);
  if (!document) throw new Error("Figma node was not found.");

  const components = asRecord(selected?.components) ?? asRecord(payload?.components) ?? {};
  const componentSets =
    asRecord(selected?.componentSets) ??
    asRecord(selected?.component_sets) ??
    asRecord(payload?.componentSets) ??
    asRecord(payload?.component_sets) ??
    {};
  return {
    node: normalizeFigmaNode(document),
    components: components as FigmaNodeResponse["components"],
    componentSets: componentSets as FigmaNodeResponse["componentSets"],
  };
};

export const exportFigmaNodeAsDataUrl = async (
  fileKey: string,
  nodeId: string,
  format: "png" | "svg",
): Promise<{
  src: string;
  mimeType: "image/png" | "image/svg+xml";
  byteSize: number;
}> => {
  const exportResponse = await figmaFetch(
    `/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(nodeId)}&format=${format}`,
  );
  const exportPayload = asRecord(await exportResponse.json());
  const images = asRecord(exportPayload?.images);
  const temporaryUrl = asString(images?.[nodeId]);
  if (!temporaryUrl) throw new Error("Figma asset export was unavailable.");

  const assetResponse = await fetch(temporaryUrl);
  if (!assetResponse.ok) throw new Error("Figma asset download failed.");

  const bytes = await readFigmaAssetBytes(assetResponse);

  const mimeType = format === "png" ? "image/png" : "image/svg+xml";
  return {
    src: `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`,
    mimeType,
    byteSize: bytes.byteLength,
  };
};

/** Download the original image fill, so editable descendants are never baked in. */
const downloadFigmaImageFill = async (
  node: FigmaNormalizedNode,
  getImageUrls: () => Promise<Record<string, unknown>>,
): Promise<FigmaTransientAsset> => {
  const paint = node.fills?.map(asRecord).find((fill) => fill?.type === "IMAGE" && fill.visible !== false);
  const imageRef = asString(paint?.imageRef);
  const url = imageRef ? asString((await getImageUrls())[imageRef]) : undefined;
  if (!url) throw new Error("Figma image fill was unavailable.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Figma image fill download failed.");
  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim();
  if (!mimeType || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType)) {
    throw new Error("Unsupported Figma image fill format.");
  }
  const bytes = await readFigmaAssetBytes(response);
  return {
    sourceNodeId: node.id,
    kind: "imageFill",
    src: `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`,
    mimeType: mimeType as FigmaTransientAsset["mimeType"],
    byteSize: bytes.byteLength,
  };
};

export const fetchFigmaGridCandidates = async (source: {
  fileKey: string;
  nodeId: string;
}): Promise<{
  candidates: Array<Omit<FigmaGridCandidateSource, "frame" | "placementInstanceIds" | "variants">>;
  warnings: string[];
}> => {
  const { node } = await fetchFigmaGridNode(source);
  if (!isSupportedGridRoot(node)) throw new FigmaGridScopeError();
  const warnings: string[] = [];
  let imageUrls: Promise<Record<string, unknown>> | undefined;
  const getImageUrls = () => imageUrls ??= (async () => {
    const payload = asRecord(await (await figmaFetch(`/files/${encodeURIComponent(source.fileKey)}/images`)).json());
    return asRecord(asRecord(payload?.meta)?.images) ?? {};
  })();
  const candidates = await Promise.all(
    (node.children ?? [])
      .filter(isGridCardRoot)
      .map(async (root): Promise<Omit<FigmaGridCandidateSource, "frame" | "placementInstanceIds" | "variants">> => {
        const candidateWarnings: string[] = [];
        const assets: FigmaTransientAsset[] = [];
        for (const assetNode of collectDecorativeAssetNodes(root)) {
          try {
            if ((assetNode.children?.length ?? 0) > 0 && !isFigmaVectorType(assetNode.type)) {
              if (assetNode.fills?.some((fill) => asRecord(fill)?.type === "IMAGE")) {
                assets.push(await downloadFigmaImageFill(assetNode, getImageUrls));
              }
              // Container effects are warned by the converter; a full export would duplicate children.
              continue;
            }
            assets.push({
              sourceNodeId: assetNode.id,
              kind: "fullNode",
              ...(await exportFigmaNodeAsDataUrl(
                source.fileKey,
                assetNode.id,
                "png",
              )),
            });
          } catch (error) {
            candidateWarnings.push(
              error instanceof Error &&
                error.message === "Figma asset exceeds the maximum size."
                ? "A decorative asset exceeded 10 MiB and was omitted."
                : "A decorative asset could not be exported and was omitted.",
            );
          }
        }
        return {
          candidateId: root.id,
          label: root.name,
          root,
          assets,
          warnings: candidateWarnings,
        };
      }),
  );

  if (candidates.length === 0) {
    warnings.push(
      "No visible GRID day-card children were found in the selected node.",
    );
  }
  return { candidates, warnings };
};

const isVisibleGridPlacement = (node: FigmaNormalizedNode): boolean =>
  node.visible !== false &&
  node.type === "INSTANCE" &&
  node.id.length > 0 &&
  !EXCLUDED_GRID_ROOTS.has(normalizeLayerName(node.name));

type FigmaOriginNodeData = {
  root: FigmaNormalizedNode;
  components: Record<string, Record<string, unknown>>;
  componentSets: Record<string, Record<string, unknown>>;
};

const fetchFigmaOriginNodes = async (source: { fileKey: string; nodeIds: string[] }) => {
  const ids = [...new Set(source.nodeIds)];
  if (ids.length === 0) return new Map<string, FigmaOriginNodeData>();
  const path = `/files/${encodeURIComponent(source.fileKey)}/nodes?ids=${encodeURIComponent(ids.join(","))}&geometry=paths`;
  const payload = asRecord(await (await figmaFetch(path)).json());
  const nodes = asRecord(payload?.nodes);
  const result = new Map<string, FigmaOriginNodeData>();
  for (const id of ids) {
    const selected = asRecord(nodes?.[id]);
    const document = asRecord(selected?.document);
    if (!document) continue;
    result.set(id, {
      root: normalizeFigmaNode(document),
      components: (asRecord(selected?.components) ?? asRecord(payload?.components) ?? {}) as Record<string, Record<string, unknown>>,
      componentSets: (asRecord(selected?.componentSets) ?? asRecord(selected?.component_sets) ?? asRecord(payload?.componentSets) ?? asRecord(payload?.component_sets) ?? {}) as Record<string, Record<string, unknown>>,
    });
  }
  return result;
};

const createOriginAssets = async (input: {
  fileKey: string;
  root: FigmaNormalizedNode;
  getImageUrls: () => Promise<Record<string, unknown>>;
}) => {
  const assets: FigmaTransientAsset[] = [];
  const warnings: string[] = [];
  for (const assetNode of collectDecorativeAssetNodes(input.root)) {
    try {
      if ((assetNode.children?.length ?? 0) > 0 && !isFigmaVectorType(assetNode.type)) {
        if (assetNode.fills?.some((fill) => asRecord(fill)?.type === "IMAGE")) {
          assets.push(await downloadFigmaImageFill(assetNode, input.getImageUrls));
        }
        continue;
      }
      assets.push({
        sourceNodeId: assetNode.id,
        kind: "fullNode",
        ...(await exportFigmaNodeAsDataUrl(input.fileKey, assetNode.id, "png")),
      });
    } catch (error) {
      warnings.push(
        error instanceof Error && error.message === "Figma asset exceeds the maximum size."
          ? "A decorative asset exceeded 10 MiB and was omitted."
          : "A decorative asset could not be exported and was omitted.",
      );
    }
  }
  return { assets, warnings };
};

const findNodePath = (root: FigmaNormalizedNode, nodeId: string): string | undefined => {
  const visit = (node: FigmaNormalizedNode, path: string): string | undefined => {
    if (node.id === nodeId) return path;
    for (const [index, child] of (node.children ?? []).entries()) {
      const found = visit(child, `${path}/${index}`);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return visit(root, "");
};

const aggregateSemanticEvidence = (
  evidenceByPath: Map<string, FigmaGridCandidateSource["variants"]["online"]["placementEvidence"][string]>,
  evidence: FigmaGridCandidateSource["variants"]["online"]["placementEvidence"],
  root: FigmaNormalizedNode,
) => {
  for (const [nodeId, current] of Object.entries(evidence)) {
    const path = findNodePath(root, nodeId);
    if (path === undefined) continue;
    const existing = evidenceByPath.get(path);
    if (!existing) {
      evidenceByPath.set(path, {
        ...current,
        samples: [...current.samples],
        sampleValues: [...current.sampleValues],
        signals: [...current.signals],
      });
      continue;
    }
    for (const sample of current.samples) {
      if (!existing.samples.some((entry) => entry.placementInstanceId === sample.placementInstanceId)) {
        existing.samples.push(sample);
        existing.sampleValues.push(sample.value);
      }
    }
    existing.matchedPlacementCount = existing.samples.length;
    existing.distinctValueCount = new Set(existing.sampleValues.map((value) => value.trim().toLowerCase())).size;
    existing.signals = [...new Set([...existing.signals, ...current.signals])];
  }
};

const evidenceByNodePath = (
  root: FigmaNormalizedNode,
  evidenceByPath: Map<string, FigmaGridCandidateSource["variants"]["online"]["placementEvidence"][string]>,
) => {
  const result: FigmaGridCandidateSource["variants"]["online"]["placementEvidence"] = {};
  const visit = (node: FigmaNormalizedNode, path: string) => {
    const evidence = evidenceByPath.get(path);
    if (evidence) result[node.id] = { ...evidence, samples: [...evidence.samples], sampleValues: [...evidence.sampleValues], signals: [...evidence.signals] };
    node.children?.forEach((child, index) => visit(child, `${path}/${index}`));
  };
  visit(root, "");
  return result;
};

export const fetchFigmaGridOriginCandidates = async (source: {
  fileKey: string;
  nodeId: string;
}): Promise<{ candidates: FigmaGridCandidateSource[]; warnings: string[] }> => {
  const { node, components, componentSets } = await fetchFigmaGridNode(source);
  if (!isSupportedGridRoot(node)) throw new FigmaGridScopeError();

  const warnings: string[] = [];
  const placements = (node.children ?? [])
    .filter(isVisibleGridPlacement)
    .flatMap((instance) => {
      const origin = resolveFigmaOriginComponent({ instance, components, componentSets });
      if (!origin) return [];
      return [{ instance, origin, placementStatus: inferFigmaGridVariantStatus(instance.componentProperties) }];
    });
  const groups = groupFigmaGridPlacements({
    placements: placements.map(({ instance, origin }) => ({ instance, origin })),
  });
  const originNodeIds = Object.values(groups).flatMap((group) =>
    group.origins.map((origin) => origin.componentNodeId),
  );
  const originNodes = await fetchFigmaOriginNodes({ fileKey: source.fileKey, nodeIds: originNodeIds });

  let imageUrls: Promise<Record<string, unknown>> | undefined;
  const getImageUrls = () => imageUrls ??= (async () => {
    const payload = asRecord(await (await figmaFetch(`/files/${encodeURIComponent(source.fileKey)}/images`)).json());
    return asRecord(asRecord(payload?.meta)?.images) ?? {};
  })();
  const candidates: FigmaGridCandidateSource[] = [];

  for (const group of Object.values(groups)) {
    const groupPlacements = placements.filter(({ origin }) => origin.componentSetNodeId === group.componentSetNodeId);
    const originStatusByComponentId = new Map<string, "online" | "offline">();
    const originDataByComponentId = new Map<string, FigmaOriginNodeData>();
    const groupWarnings: string[] = [];
    let complete = true;
    for (const origin of group.origins) {
      const originData = originNodes.get(origin.componentNodeId);
      if (!originData) {
        complete = false;
        continue;
      }
      const componentMetadata = originData.components[origin.componentId] ??
        Object.values(originData.components).find((metadata) =>
          metadata.node_id === origin.componentNodeId || metadata.nodeId === origin.componentNodeId,
        );
      const componentSetMetadata = originData.componentSets[origin.componentSetNodeId];
      const status = inferFigmaGridOriginVariantStatus({
        root: originData.root,
        origin,
        componentMetadata,
        componentSetMetadata,
      });
      if (!status) {
        complete = false;
        const warning = "A GRID origin variant was excluded because its online/offline status was missing or ambiguous.";
        warnings.push(warning);
        groupWarnings.push(warning);
        continue;
      }
      originStatusByComponentId.set(origin.componentId, status);
      originDataByComponentId.set(origin.componentId, originData);
    }
    if (new Set(originStatusByComponentId.values()).size !== 2) complete = false;
    const byStatus = new Map<"online" | "offline", typeof groupPlacements>();
    for (const placement of groupPlacements) {
      const authoritativeStatus = originStatusByComponentId.get(placement.origin.componentId);
      if (!authoritativeStatus) continue;
      if (placement.placementStatus && placement.placementStatus !== authoritativeStatus) {
        const warning = "A GRID placement status disagreed with its explicit origin status; origin status remained authoritative.";
        warnings.push(warning);
        groupWarnings.push(warning);
      }
      const bucket = byStatus.get(authoritativeStatus) ?? [];
      bucket.push(placement);
      byStatus.set(authoritativeStatus, bucket);
    }
    const variants = {} as FigmaGridCandidateSource["variants"];
    const evidenceByPath = new Map<string, FigmaGridCandidateSource["variants"]["online"]["placementEvidence"][string]>();
    for (const status of ["online", "offline"] as const) {
      const statusPlacements = byStatus.get(status) ?? [];
      const originIds = group.origins
        .filter((origin) => originStatusByComponentId.get(origin.componentId) === status)
        .map((origin) => origin.componentId);
      if (originIds.length !== 1) {
        complete = false;
        continue;
      }
      const origin = statusPlacements[0]?.origin;
      const originData = origin ? originDataByComponentId.get(origin.componentId) : undefined;
      const root = originData?.root;
      if (!origin || !originData || !root) {
        complete = false;
        continue;
      }
      const exported = await createOriginAssets({ fileKey: source.fileKey, root, getImageUrls });
      const mapped = mapFigmaPlacementNodesToOrigin({
        origin: root,
        placements: statusPlacements.map(({ instance }) => ({
          instanceId: instance.id,
          status,
          root: instance,
        })),
      });
      aggregateSemanticEvidence(evidenceByPath, mapped.evidenceByOriginNodeId, root);
      variants[status] = {
        status,
        origin,
        root,
        assets: exported.assets,
        placementEvidence: mapped.evidenceByOriginNodeId,
        originMetadata: {
          component: originData.components[origin.componentId] ?? Object.values(originData.components).find((metadata) =>
            metadata.node_id === origin.componentNodeId || metadata.nodeId === origin.componentNodeId,
          ),
          componentSet: originData.componentSets[origin.componentSetNodeId],
        },
        warnings: [...exported.warnings, ...mapped.warnings],
      };
    }
    for (const variant of Object.values(variants)) {
      variant.componentSetEvidence = evidenceByNodePath(variant.root, evidenceByPath);
      variant.semanticReviews = inferFigmaSemanticEvidence({
        origin: variant.root,
        evidenceByOriginNodeId: variant.placementEvidence,
        componentSetEvidence: variant.componentSetEvidence,
      });
    }
    if (!complete) {
      warnings.push("A GRID component set was excluded because it did not resolve to exactly one online and one offline origin.");
      continue;
    }
    const online = variants.online;
    candidates.push({
      candidateId: group.componentSetNodeId,
      label: online.origin.componentSetName ?? online.origin.componentName,
      frame: online.root.frame ?? online.root.absoluteBounds ?? { left: 0, top: 0, width: 0, height: 0 },
      placementInstanceIds: group.placementInstanceIds,
      variants,
      root: online.root,
      assets: online.assets,
      warnings: [...groupWarnings, ...online.warnings, ...variants.offline.warnings],
    });
  }
  if (candidates.length === 0 && warnings.length === 0) {
    warnings.push("No complete GRID origin component sets were found.");
  }
  return { candidates, warnings };
};
