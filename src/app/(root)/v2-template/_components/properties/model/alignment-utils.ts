export const v2_HORIZONTAL_ALIGN_TO_JUSTIFY: Record<
  "left" | "center" | "right",
  string
> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export const v2_JUSTIFY_TO_HORIZONTAL_ALIGN: Partial<
  Record<string, "left" | "center" | "right">
> = {
  "flex-start": "left",
  center: "center",
  "flex-end": "right",
};

export const v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS: Record<
  "top" | "center" | "bottom",
  string
> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};

export const v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN: Partial<
  Record<string, "top" | "center" | "bottom">
> = {
  "flex-start": "top",
  center: "center",
  "flex-end": "bottom",
};
