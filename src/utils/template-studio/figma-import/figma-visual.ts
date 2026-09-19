/** These outlines cannot be represented by the Studio rectangular shape renderer. */
export const isFigmaVectorType = (type: string): boolean =>
  ["VECTOR", "ELLIPSE", "STAR", "POLYGON", "REGULAR_POLYGON", "LINE", "BOOLEAN_OPERATION"].includes(type);
