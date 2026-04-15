export const v2_RUNTIME_HIGHLIGHT_TARGETS = [
  "grid",
  "weekFlag",
  "topObjectContainer",
  "profileImage",
  "profileFrame",
  "artistObject",
  "memoObject",
  "profileText",
  "memoText",
  "cardStreamingDay",
  "cardStreamingDate",
  "cardStreamingTime",
  "cardMainTitleContainer",
  "cardSubTitleContainer",
  "cardContainer",
] as const;

export type V2RuntimeHighlightTarget =
  | (typeof v2_RUNTIME_HIGHLIGHT_TARGETS)[number]
  | string;
