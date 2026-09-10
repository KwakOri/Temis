import type {
  FigmaGridCandidateSource,
  FigmaNormalizedNode,
  FigmaNodeResponse,
  FigmaTransientAsset,
} from "@/types/template-studio-figma";
import { normalizeFigmaRotation } from "@/utils/template-studio/figma-import/figma-rotation";

const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const MAX_FIGMA_ASSET_SIZE_BYTES = 10 * 1024 * 1024;
const EXCLUDED_GRID_ROOTS = new Set([
  "profile",
  "topobject",
  "board",
  "weekdates",
  "background",
  "pagebackground",
]);

type FigmaRawNode = Record<string, unknown>;

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

const normalizeFigmaNode = (raw: FigmaRawNode): FigmaNormalizedNode => {
  const absoluteBounds = normalizeBounds(raw.absoluteBoundingBox);
  const absoluteRenderBounds = normalizeBounds(raw.absoluteRenderBounds);
  const rotation = normalizeFigmaRotation(asNumber(raw.rotation));
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
    textAutoResize: asString(raw.textAutoResize),
    layoutSizingHorizontal: asString(raw.layoutSizingHorizontal),
    layoutSizingVertical: asString(raw.layoutSizingVertical),
    layoutMode: asString(raw.layoutMode),
    visible: typeof raw.visible === "boolean" ? raw.visible : undefined,
    opacity: asNumber(raw.opacity),
    fills: Array.isArray(raw.fills) ? raw.fills : undefined,
    absoluteBounds,
    absoluteRenderBounds,
    style: asRecord(raw.style) ?? undefined,
    rotation,
    rotatedWidth: absoluteRenderBounds?.width,
    rotatedHeight: absoluteRenderBounds?.height,
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
  node.fills?.some((fill) => asRecord(fill)?.type === "IMAGE") === true;

const collectDecorativeAssetNodes = (
  node: FigmaNormalizedNode,
): FigmaNormalizedNode[] => [
  ...(isDecorativeAssetNode(node) ? [node] : []),
  ...(node.children?.flatMap(collectDecorativeAssetNodes) ?? []),
];

const isGridCardRoot = (node: FigmaNormalizedNode): boolean =>
  node.visible !== false &&
  node.id.length > 0 &&
  !EXCLUDED_GRID_ROOTS.has(normalizeLayerName(node.name));

export const fetchFigmaGridNode = async (source: {
  fileKey: string;
  nodeId: string;
}): Promise<FigmaNodeResponse> => {
  const path = `/files/${encodeURIComponent(source.fileKey)}/nodes?ids=${encodeURIComponent(source.nodeId)}`;
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

  const declaredSize = Number(assetResponse.headers.get("content-length"));
  if (
    Number.isFinite(declaredSize) &&
    declaredSize > MAX_FIGMA_ASSET_SIZE_BYTES
  ) {
    throw new Error("Figma asset exceeds the maximum size.");
  }

  const bytes = new Uint8Array(await assetResponse.arrayBuffer());
  if (bytes.byteLength > MAX_FIGMA_ASSET_SIZE_BYTES) {
    throw new Error("Figma asset exceeds the maximum size.");
  }

  const mimeType = format === "png" ? "image/png" : "image/svg+xml";
  return {
    src: `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`,
    mimeType,
    byteSize: bytes.byteLength,
  };
};

export const fetchFigmaGridCandidates = async (source: {
  fileKey: string;
  nodeId: string;
}): Promise<{ candidates: FigmaGridCandidateSource[]; warnings: string[] }> => {
  const { node } = await fetchFigmaGridNode(source);
  const warnings: string[] = [];
  const candidates = await Promise.all(
    (node.children ?? [])
      .filter(isGridCardRoot)
      .map(async (root): Promise<FigmaGridCandidateSource> => {
        const candidateWarnings: string[] = [];
        const assets: FigmaTransientAsset[] = [];
        for (const assetNode of collectDecorativeAssetNodes(root)) {
          try {
            assets.push({
              sourceNodeId: assetNode.id,
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
