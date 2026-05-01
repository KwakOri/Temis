export const v2_RUNTIME_HIGHLIGHT_TARGETS = [
  "grid",
  "weekFlag",
  "topObjectContainer",
  "frameArtwork",
  "frameObject",
  "profileImage",
  "profileFrame",
  "artistText",
  "artistObject",
  "memoObject",
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
