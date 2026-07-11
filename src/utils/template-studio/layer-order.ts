export type StudioLayerDropPosition = "before" | "after" | "inside";

/** JSON stores siblings from the back of the canvas to the front. */
export const getStudioPaintOrder = <T>(ids: readonly T[]): T[] => [...ids];

/** Layer panels show the front-most sibling first. */
export const getStudioLayerPanelOrder = <T>(ids: readonly T[]): T[] =>
  [...ids].reverse();

/** A panel's visual before/after is the inverse of the stored paint order. */
export const getStudioDataDropPosition = <
  TPosition extends StudioLayerDropPosition,
>(
  position: TPosition,
): TPosition => {
  if (position === "before") return "after" as TPosition;
  if (position === "after") return "before" as TPosition;
  return position;
};
