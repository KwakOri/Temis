export const v2_parseGridLayoutMode = (
  value: unknown
): "grid3x3" | "flex4x2" | "free" => {
  if (value === "flex4x2") return "flex4x2";
  if (value === "free") return "free";
  return "grid3x3";
};

export const v2_parseFlex42Align = (
  value: unknown
): "left" | "center" | "right" => {
  if (value === "left" || value === "center" || value === "right") return value;
  return "center";
};

export const v2_parseFlex42ThreeRow = (value: unknown): "top" | "bottom" => {
  return value === "top" ? "top" : "bottom";
};

export const v2_parseGridEmptySlot = (value: unknown): number | null => {
  const candidate =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;

  if (!Number.isFinite(candidate)) return null;
  const rounded = Math.round(candidate);
  if (rounded < 1 || rounded > 9) return null;
  return rounded;
};

export const v2_getGridEmptySlotsFromMap = (
  sectionMap: Record<string, string | number>
): number[] => {
  const slots = [
    v2_parseGridEmptySlot(sectionMap.gridEmptySlotA),
    v2_parseGridEmptySlot(sectionMap.gridEmptySlotB),
  ].filter((slot): slot is number => slot !== null);

  return Array.from(new Set(slots)).slice(0, 2);
};

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
