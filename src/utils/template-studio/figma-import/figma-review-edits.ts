import type {
  StudioBinding,
  StudioGraphNode,
  StudioGraphNodeType,
  StudioTextAppearance,
} from "@/types/template-studio";
import type {
  StudioFigmaGridCandidate,
  StudioFigmaGridOriginCandidate,
  StudioFigmaGridVariantCandidate,
  StudioFigmaNodeReview,
} from "@/types/template-studio-figma";
import { bindingForFigmaRole } from "./figma-text-classifier";

const TEXT_TYPES = new Set<StudioGraphNodeType>(["text", "flexibleText"]);
const IMAGE_TYPES = new Set<StudioGraphNodeType>(["image"]);

const reviewsEqual = (left: StudioFigmaNodeReview, right: StudioFigmaNodeReview): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const reviewChangedFrom = (
  review: StudioFigmaNodeReview | undefined,
  reviewDefault: StudioFigmaNodeReview | undefined,
): boolean => review !== undefined && reviewDefault !== undefined && !reviewsEqual(review, reviewDefault);

const cloneBinding = (binding: StudioBinding): StudioBinding =>
  structuredClone(binding);

const isTextBinding = (binding: StudioBinding): boolean =>
  ["staticText", "inputText", "selectText", "builtinField"].includes(binding.kind);

const isImageBinding = (binding: StudioBinding): boolean =>
  ["staticAsset", "inputImage", "selectAsset"].includes(binding.kind);

const getReviewBinding = (
  node: StudioGraphNode,
  review: StudioFigmaNodeReview,
  bindingTouched: boolean,
  roleTouched: boolean,
): StudioBinding | undefined => {
  if (bindingTouched) {
    return cloneBinding(review.suggestedBinding);
  }
  if (roleTouched) return bindingForFigmaRole(review.suggestedRole, review.sourceCharacters ??
    (review.suggestedBinding.kind === "staticText" ? review.suggestedBinding.value : ""));
  return node.binding ? cloneBinding(node.binding) : undefined;
};

const fallbackTextAppearance = (color?: string): StudioTextAppearance => ({
  fill: { type: "solid", color: color ?? "#000000", opacity: 1 },
  strokes: [],
});

const applyReviewToNode = (
  component: StudioFigmaGridVariantCandidate["component"],
  node: StudioGraphNode,
  review: StudioFigmaNodeReview,
  bindingTouched: boolean,
  roleTouched: boolean,
  typeTouched: boolean,
) => {
  const nextType = typeTouched ? review.suggestedStudioType : node.type;
  node.type = nextType;
  const binding = getReviewBinding(node, review, bindingTouched, roleTouched);

  if (TEXT_TYPES.has(nextType)) {
    delete node.shapeFill;
    delete node.fit;
    node.textAppearance ??= fallbackTextAppearance(
      node.styleId ? String(component.styles[node.styleId]?.color ?? "") : undefined,
    );
    node.binding = binding && isTextBinding(binding) ? binding : { kind: "staticText", value: review.sourceCharacters ?? "" };
    return;
  }

  delete node.textAppearance;
  if (nextType !== "shape") delete node.shapeFill;
  if (!IMAGE_TYPES.has(nextType)) delete node.fit;

  if (IMAGE_TYPES.has(nextType)) {
    node.binding = binding && isImageBinding(binding) ? binding : undefined;
  } else {
    delete node.binding;
  }
};

/**
 * Applies transient review edits through the converter's exact source-node map.
 * `reviewNodeIds` and `bindingTouchedSourceNodeIds` are transient UI metadata;
 * neither is consumed by the document merger.
 */
export function applyStudioFigmaReviewEdits(
  candidate: StudioFigmaGridOriginCandidate,
  bindingTouchedSourceNodeIds?: Readonly<Record<string, boolean>>,
): StudioFigmaGridOriginCandidate;
export function applyStudioFigmaReviewEdits(
  candidate: StudioFigmaGridCandidate,
  bindingTouchedSourceNodeIds?: Readonly<Record<string, boolean>>,
): StudioFigmaGridCandidate;
export function applyStudioFigmaReviewEdits(
  candidate: StudioFigmaGridCandidate | StudioFigmaGridOriginCandidate,
  bindingTouchedSourceNodeIds?: Readonly<Record<string, boolean>>,
): StudioFigmaGridCandidate | StudioFigmaGridOriginCandidate;
export function applyStudioFigmaReviewEdits(
  candidate: StudioFigmaGridCandidate | StudioFigmaGridOriginCandidate,
  bindingTouchedSourceNodeIds: Readonly<Record<string, boolean>> = {},
): StudioFigmaGridCandidate | StudioFigmaGridOriginCandidate {
  const nextCandidate = structuredClone(candidate);
  const compatibilityReviews = "reviews" in nextCandidate && Array.isArray(nextCandidate.reviews)
    ? nextCandidate.reviews as StudioFigmaNodeReview[]
    : undefined;
  const compatibilityReviewBySourceId = compatibilityReviews
    ? new Map(compatibilityReviews.map((review) => [review.sourceNodeId, review]))
    : undefined;
  const compatibilityReviewDefaults = "reviewDefaults" in nextCandidate
    ? nextCandidate.reviewDefaults
    : undefined;
  const variants: StudioFigmaGridVariantCandidate[] = "variants" in nextCandidate
    ? Object.values(nextCandidate.variants)
    : [{
      status: "online",
      origin: { componentId: "", componentNodeId: "", componentSetNodeId: "", componentName: "" },
      component: nextCandidate.component,
      reviews: nextCandidate.reviews,
      reviewNodeIds: nextCandidate.reviewNodeIds,
      reviewDefaults: nextCandidate.reviewDefaults,
      warnings: nextCandidate.warnings,
  }];
  variants.forEach((variant) => {
    if (variant.status === "online" && compatibilityReviewBySourceId) {
      variant.reviews = variant.reviews.map((review) => {
        const compatibilityReview = compatibilityReviewBySourceId.get(review.sourceNodeId);
        if (!compatibilityReview) return review;
        const compatibilityChanged = reviewChangedFrom(
          compatibilityReview,
          compatibilityReviewDefaults?.[review.sourceNodeId],
        );
        const variantChanged = reviewChangedFrom(
          review,
          variant.reviewDefaults?.[review.sourceNodeId],
        );
        return compatibilityChanged && !variantChanged ? compatibilityReview : review;
      });
    }
    variant.reviews.forEach((review) => {
      const graphNodeId = variant.reviewNodeIds?.[review.sourceNodeId];
      const graphNode = graphNodeId ? variant.component.nodes[graphNodeId] : undefined;
      if (!graphNode) return;
      const initial = variant.reviewDefaults?.[review.sourceNodeId];
      const roleTouched = initial ? review.suggestedRole !== initial.suggestedRole : true;
      const typeTouched = initial ? review.suggestedStudioType !== initial.suggestedStudioType : true;
      const bindingTouched = bindingTouchedSourceNodeIds[`${variant.status}:${review.sourceNodeId}`] === true ||
        bindingTouchedSourceNodeIds[review.sourceNodeId] === true ||
        (initial !== undefined && JSON.stringify(review.suggestedBinding) !== JSON.stringify(initial.suggestedBinding));
      if (!roleTouched && !typeTouched && !bindingTouched) return;
      applyReviewToNode(variant.component, graphNode, review, bindingTouched, roleTouched, typeTouched);
      review.decision = "manual";
    });
  });
  return nextCandidate;
}
