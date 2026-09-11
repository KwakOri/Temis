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

const isTextBinding = (binding: StudioBinding): boolean =>
  ["staticText", "inputText", "selectText", "builtinField"].includes(binding.kind);

const isImageBinding = (binding: StudioBinding): boolean =>
  ["staticAsset", "inputImage", "selectAsset"].includes(binding.kind);

const getReviewBinding = (review: StudioFigmaNodeReview): StudioBinding | undefined => {
  if (review.suggestedRole === "decoration") return undefined;
  const roleBinding = roleBindings[review.suggestedRole];
  if (roleBinding && review.suggestedBinding.kind !== "staticText") {
    return cloneBinding(roleBinding);
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
  node.type = nextType;

  if (TEXT_TYPES.has(nextType)) {
    delete node.shapeFill;
    delete node.fit;
    node.textAppearance ??= fallbackTextAppearance(
      node.styleId ? String(candidate.component.styles[node.styleId]?.color ?? "") : undefined,
    );
    const binding = getReviewBinding(review);
    node.binding = binding && isTextBinding(binding) ? binding : { kind: "staticText", value: "" };
    return;
  }

  delete node.textAppearance;
  if (nextType !== "shape") delete node.shapeFill;
  if (!IMAGE_TYPES.has(nextType)) delete node.fit;

  const binding = review.suggestedRole === "decoration" && node.binding && isImageBinding(node.binding)
    ? cloneBinding(node.binding)
    : getReviewBinding(review);
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
