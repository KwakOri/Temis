export const v2_TEMPLATE_HIGHLIGHT_TARGETS = [
  "grid",
  "weekFlag",
  "topObjectContainer",
  "profileImage",
  "profileFrame",
  "cardStreamingDay",
  "cardStreamingDate",
  "cardStreamingTime",
  "cardMainTitleContainer",
  "cardSubTitleContainer",
  "cardContainer",
] as const;

export type V2TemplateHighlightTarget =
  | (typeof v2_TEMPLATE_HIGHLIGHT_TARGETS)[number]
  | string;
