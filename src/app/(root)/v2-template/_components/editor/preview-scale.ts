export const v2_PREVIEW_SCALE_MIN = 0.1;
export const v2_PREVIEW_SCALE_MAX_DESKTOP = 2.0;
export const v2_PREVIEW_SCALE_MAX_MOBILE = 1.0;

export const v2_clampPreviewScale = ({
  value,
  isMobile,
}: {
  value: number;
  isMobile: boolean;
}) => {
  const max = isMobile ? v2_PREVIEW_SCALE_MAX_MOBILE : v2_PREVIEW_SCALE_MAX_DESKTOP;
  return Math.min(Math.max(value, v2_PREVIEW_SCALE_MIN), max);
};
