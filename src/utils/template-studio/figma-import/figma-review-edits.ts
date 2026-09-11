import type {
  StudioBinding,
  StudioGraphNode,
  StudioGraphNodeType,
  StudioTextAppearance,
} from "@/types/template-studio";
import type {
  StudioFigmaGridCandidate,
  StudioFigmaNodeReview,
  StudioFigmaNodeReviewRole,
} from "@/types/template-studio-figma";

const TEXT_TYPES = new Set<StudioGraphNodeType>(["text", "flexibleText"]);
const IMAGE_TYPES = new Set<StudioGraphNodeType>(["image"]);

const roleBindings: Partial<Record<StudioFigmaNodeReviewRole, StudioBinding>> = {
  main_title: { kind: "builtinField", fieldId: "entry.main_title" },
  sub_title: { kind: "builtinField", fieldId: "entry.sub_title" },
  time: { kind: "builtinField", fieldId: "entry.time" },
  day_label: { kind: "builtinField", fieldId: "day.short_label" },
  date: { kind: "builtinField", fieldId: "day.date", dateRangeFormat: "day" },
  status_label: { kind: "builtinField", fieldId: "entry.status_label" },
};

const cloneBinding = (binding: StudioBinding): StudioBinding =>
  structuredClone(binding);

const bindingsEqual = (
  left: StudioBinding | undefined,
  right: StudioBinding | undefined,
): boolean => JSON.stringify(left) === JSON.stringify(right);

const isTextBinding = (binding: StudioBinding): boolean =>
  ["staticText", "inputText", "selectText", "builtinField"].includes(binding.kind);

const isImageBinding = (binding: StudioBinding): boolean =>
  ["staticAsset", "inputImage", "selectAsset"].includes(binding.kind);

const getReviewBinding = (
  review: StudioFigmaNodeReview,
  originalBinding: StudioBinding | undefined,
): StudioBinding | undefined => {
  if (!bindingsEqual(review.suggestedBinding, originalBinding)) {
    return cloneBinding(review.suggestedBinding);
  }
  if (review.suggestedRole === "decoration") return undefined;
  const roleBinding = roleBindings[review.suggestedRole];
  if (roleBinding) {
    return cloneBinding(roleBinding);
  }
  if (review.suggestedRole === "unknown" && review.suggestedBinding.kind === "builtinField") {
    return { kind: "staticText", value: "" };
  }
  return cloneBinding(review.suggestedBinding);
};

const fallbackTextAppearance = (color?: string): StudioTextAppearance => ({
  fill: { type: "solid", color: color ?? "#000000", opacity: 1 },
  strokes: [],
});

const applyReviewToNode = (
  candidate: StudioFigmaGridCandidate,
  node: StudioGraphNode,
  review: StudioFigmaNodeReview,
) => {
  const nextType = review.suggestedStudioType;
  const originalBinding = node.binding;
  node.type = nextType;

  if (TEXT_TYPES.has(nextType)) {
    delete node.shapeFill;
    delete node.fit;
    node.textAppearance ??= fallbackTextAppearance(
      node.styleId ? String(candidate.component.styles[node.styleId]?.color ?? "") : undefined,
    );
    const binding = getReviewBinding(review, originalBinding);
    node.binding = binding && isTextBinding(binding) ? binding : { kind: "staticText", value: "" };
    return;
  }

  delete node.textAppearance;
  if (nextType !== "shape") delete node.shapeFill;
  if (!IMAGE_TYPES.has(nextType)) delete node.fit;

  const binding = review.suggestedRole === "decoration" && node.binding && isImageBinding(node.binding)
    ? cloneBinding(node.binding)
    : getReviewBinding(review, originalBinding);
  if (IMAGE_TYPES.has(nextType)) {
    node.binding = binding && isImageBinding(binding) ? binding : undefined;
  } else {
    delete node.binding;
  }
};

/**
 * Applies transient review edits through the converter's exact source-node map.
 * `reviewNodeIds` is intentionally not consumed by the document merger.
 */
export const applyStudioFigmaReviewEdits = (
  candidate: StudioFigmaGridCandidate,
): StudioFigmaGridCandidate => {
  const nextCandidate = structuredClone(candidate);
  nextCandidate.reviews.forEach((review) => {
    const graphNodeId = nextCandidate.reviewNodeIds?.[review.sourceNodeId];
    const graphNode = graphNodeId
      ? nextCandidate.component.nodes[graphNodeId]
      : undefined;
    if (!graphNode) return;
    applyReviewToNode(nextCandidate, graphNode, review);
  });
  return nextCandidate;
};
