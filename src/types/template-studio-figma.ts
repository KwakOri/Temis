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

export type StudioFigmaGridVariantStatus = "online" | "offline";
export type FigmaReviewSource = "rule" | "ai" | "hybrid";
export type FigmaReviewDecision = "auto" | "needs_review" | "manual";
export type FigmaReviewAgreement = "agree" | "rule_only" | "ai_only" | "disagree";

export interface FigmaOriginComponentRef {
  componentId: string;
  componentNodeId: string;
  componentSetNodeId: string;
  componentName: string;
  componentSetName?: string;
}

export interface FigmaPlacementTextSample {
  placementInstanceId: string;
  variantStatus: StudioFigmaGridVariantStatus;
  originNodeId: string;
  value: string;
}

export interface FigmaSemanticEvidence {
  samples: FigmaPlacementTextSample[];
  sampleValues: string[];
  matchedPlacementCount: number;
  distinctValueCount: number;
  signals: Array<
    | "stable_origin_mapping"
    | "known_weekday_set"
    | "date_pattern"
    | "time_pattern"
    | "status_variant_match"
    | "value_variation"
    | "layer_name_alias"
    | "layout_support"
  >;
  mapping: "override" | "stable_path" | "structural" | "ambiguous";
}

export interface FigmaReviewCandidate {
  suggestedRole: StudioFigmaNodeReviewRole;
  suggestedStudioType: StudioFigmaNodeReview["suggestedStudioType"];
  confidence: number;
  reason: string;
}

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
  source: FigmaReviewSource;
  decision: FigmaReviewDecision;
  agreement?: FigmaReviewAgreement;
  evidence?: FigmaSemanticEvidence;
  ruleCandidate?: FigmaReviewCandidate;
  aiCandidate?: FigmaReviewCandidate;
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
  components: Record<string, {
    id?: string;
    node_id?: string;
    nodeId?: string;
    name?: string;
    componentSetId?: string;
    component_set_id?: string;
  }>;
  componentSets: Record<string, {
    id?: string;
    node_id?: string;
    nodeId?: string;
    name?: string;
  }>;
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
  /** Figma's parent-relative transform, used for local positioning under rotated parents. */
  relativeTransform?: [[number, number, number], [number, number, number]];
  componentId?: string;
  componentProperties?: Record<string, unknown>;
  overrides?: Array<Record<string, unknown>>;
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

export interface FigmaGridOriginVariantSource {
  status: StudioFigmaGridVariantStatus;
  origin: FigmaOriginComponentRef;
  root: FigmaNormalizedNode;
  assets: FigmaTransientAsset[];
  placementEvidence: Record<string, FigmaSemanticEvidence>;
  /** Aggregated transient evidence across all variants in this component set. */
  componentSetEvidence?: Record<string, FigmaSemanticEvidence>;
  warnings: string[];
}

export interface FigmaGridCandidateSource {
  candidateId: string;
  label: string;
  frame: { left: number; top: number; width: number; height: number };
  placementInstanceIds: string[];
  variants: Record<StudioFigmaGridVariantStatus, FigmaGridOriginVariantSource>;
  /** Compatibility projection for the pre-variant converter; always fetched origin data. */
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
