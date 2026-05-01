export const v2_POSITION_MUTEX_MAP: Partial<Record<string, string>> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

export const v2_hasRenderableStyleValue = (
  value: string | number | undefined
): boolean => {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
};
