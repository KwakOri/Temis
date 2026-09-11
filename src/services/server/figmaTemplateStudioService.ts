import type {
  FigmaGridCandidateSource,
  FigmaNormalizedNode,
  FigmaNodeResponse,
  FigmaTransientAsset,
} from "@/types/template-studio-figma";
import { normalizeFigmaRotation } from "@/utils/template-studio/figma-import/figma-rotation";
import { classifyFigmaTextNode } from "@/utils/template-studio/figma-import/figma-text-classifier";
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

const normalizeFigmaNode = (raw: FigmaRawNode): FigmaNormalizedNode => {
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

  return { node: normalizeFigmaNode(document) };
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
}): Promise<{ candidates: FigmaGridCandidateSource[]; warnings: string[] }> => {
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
      .map(async (root): Promise<FigmaGridCandidateSource> => {
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
                ? `Decorative asset \"${assetNode.name}\" exceeded 10 MiB and was omitted.`
                : `Decorative asset \"${assetNode.name}\" could not be exported and was omitted.`,
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
