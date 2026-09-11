import type {
  StudioBinding,
  StudioGraphNode,
  StudioGraphNodeType,
  StudioTextAppearance,
} from "@/types/template-studio";
import type {
  StudioFigmaGridCandidate,
  StudioFigmaNodeReview,
} from "@/types/template-studio-figma";
import { bindingForFigmaRole } from "./figma-text-classifier";

const TEXT_TYPES = new Set<StudioGraphNodeType>(["text", "flexibleText"]);
const IMAGE_TYPES = new Set<StudioGraphNodeType>(["image"]);

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
  candidate: StudioFigmaGridCandidate,
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
      node.styleId ? String(candidate.component.styles[node.styleId]?.color ?? "") : undefined,
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
export const applyStudioFigmaReviewEdits = (
  candidate: StudioFigmaGridCandidate,
  bindingTouchedSourceNodeIds: Readonly<Record<string, boolean>> = {},
): StudioFigmaGridCandidate => {
  const nextCandidate = structuredClone(candidate);
  nextCandidate.reviews.forEach((review) => {
    const graphNodeId = nextCandidate.reviewNodeIds?.[review.sourceNodeId];
    const graphNode = graphNodeId
      ? nextCandidate.component.nodes[graphNodeId]
      : undefined;
    if (!graphNode) return;
    const initial = candidate.reviewDefaults?.[review.sourceNodeId];
    const roleTouched = initial ? review.suggestedRole !== initial.suggestedRole : true;
    const typeTouched = initial ? review.suggestedStudioType !== initial.suggestedStudioType : true;
    const bindingTouched = bindingTouchedSourceNodeIds[review.sourceNodeId] === true ||
      (initial !== undefined && JSON.stringify(review.suggestedBinding) !== JSON.stringify(initial.suggestedBinding));
    if (!roleTouched && !typeTouched && !bindingTouched) return;
    applyReviewToNode(
      nextCandidate,
      graphNode,
      review,
      bindingTouched,
      roleTouched,
      typeTouched,
    );
  });
  return nextCandidate;
};
