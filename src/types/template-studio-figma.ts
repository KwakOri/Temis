import type {
  StudioAsset,
  StudioBinding,
  StudioGraphNode,
  StudioStyleRecord,
} from "./template-studio";

export type StudioFigmaNodeReviewRole =
  | "main_title"
  | "sub_title"
  | "time"
  | "day_label"
  | "date"
  | "status_label"
  | "decoration"
  | "unknown";

export interface StudioFigmaNodeReview {
  sourceNodeId: string;
  label: string;
  sourceType: string;
  suggestedRole: StudioFigmaNodeReviewRole;
  suggestedStudioType: "text" | "flexibleText" | "image" | "shape" | "group";
  suggestedBinding: StudioBinding;
  /** Original source text for switching back from a dynamic binding. UI-only. */
  sourceCharacters?: string;
  confidence: number;
  source: "rule" | "ai";
  reason: string;
}

export interface StudioFigmaGridCandidate {
  candidateId: string;
  label: string;
  frame: { left: number; top: number; width: number; height: number };
  component: {
    nodes: Record<string, StudioGraphNode>;
    styles: Record<string, StudioStyleRecord>;
    rootNodeId: string;
    assets: StudioAsset[];
  };
  reviews: StudioFigmaNodeReview[];
  /** Transient source-node to converted graph-node map for the review UI only. */
  reviewNodeIds?: Record<string, string>;
  /** Converter-effective choices before any user edits. Never merged into documents. */
  reviewDefaults?: Record<string, StudioFigmaNodeReview>;
  warnings: string[];
}

export interface FigmaNodeResponse {
  node: FigmaNormalizedNode;
}

export interface FigmaNormalizedNode {
  id: string;
  name: string;
  type: string;
  characters?: string;
  textAutoResize?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  layoutMode?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  visible?: boolean;
  opacity?: number;
  fills?: unknown[];
  effects?: unknown[];
  strokes?: unknown[];
  cornerRadius?: number;
  clipsContent?: boolean;
  absoluteBounds?: { left: number; top: number; width: number; height: number };
  absoluteRenderBounds?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  style?: Record<string, unknown>;
  /** Already normalized to CSS degrees at the server boundary. */
  rotateDeg?: number;
  /** Unrotated Figma size, separate from page-space bounding boxes. */
  localSize?: { width: number; height: number };
  children?: FigmaNormalizedNode[];
  frame?: { left: number; top: number; width: number; height: number };
}

export interface FigmaTransientAsset {
  sourceNodeId: string;
  src: string;
  mimeType: "image/png" | "image/svg+xml" | "image/jpeg" | "image/webp" | "image/gif";
  byteSize: number;
  /** Full-node exports bake transforms; fill images are applied in local space. */
  kind?: "fullNode" | "imageFill";
}

export interface FigmaGridCandidateSource {
  candidateId: string;
  label: string;
  root: FigmaNormalizedNode;
  assets: FigmaTransientAsset[];
  /** Filled by the analyze route after server-side review and before conversion. */
  reviews?: StudioFigmaNodeReview[];
  warnings: string[];
}

export interface StudioFigmaAnalyzeResponse {
  success: true;
  candidates: StudioFigmaGridCandidate[];
  warnings: string[];
}
