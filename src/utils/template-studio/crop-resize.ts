export interface StudioCropFrameSize {
  width: number;
  height: number;
}

export type StudioCropResizeEdge = "left" | "right" | "top" | "bottom";

export const STUDIO_CROP_FRAME_INSET = 24;
export const STUDIO_CROP_FRAME_MIN_SIZE = 80;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getStudioCropFrameLimits = (
  stageSize: StudioCropFrameSize,
  inset = STUDIO_CROP_FRAME_INSET,
) => {
  const maxWidth = Math.max(1, stageSize.width - inset * 2);
  const maxHeight = Math.max(1, stageSize.height - inset * 2);

  return {
    maxWidth,
    maxHeight,
    minWidth: Math.min(STUDIO_CROP_FRAME_MIN_SIZE, maxWidth),
    minHeight: Math.min(STUDIO_CROP_FRAME_MIN_SIZE, maxHeight),
  };
};

export const fitStudioCropFrame = (
  stageSize: StudioCropFrameSize,
  aspect: number,
  inset = STUDIO_CROP_FRAME_INSET,
): StudioCropFrameSize => {
  const { maxWidth, maxHeight } = getStudioCropFrameLimits(stageSize, inset);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const widthFromHeight = maxHeight * safeAspect;

  if (widthFromHeight <= maxWidth) {
    return { width: widthFromHeight, height: maxHeight };
  }

  return { width: maxWidth, height: maxWidth / safeAspect };
};

export const resizeStudioCropFrame = (
  frameSize: StudioCropFrameSize,
  stageSize: StudioCropFrameSize,
  edge: StudioCropResizeEdge,
  pointerDelta: number,
  inset = STUDIO_CROP_FRAME_INSET,
): StudioCropFrameSize => {
  const { minWidth, minHeight, maxWidth, maxHeight } = getStudioCropFrameLimits(
    stageSize,
    inset,
  );
  const growsWidth = edge === "left" || edge === "right";
  const nextWidth = growsWidth
    ? clamp(frameSize.width + pointerDelta * 2, minWidth, maxWidth)
    : clamp(frameSize.width, minWidth, maxWidth);
  const nextHeight = growsWidth
    ? clamp(frameSize.height, minHeight, maxHeight)
    : clamp(frameSize.height + pointerDelta * 2, minHeight, maxHeight);

  return { width: nextWidth, height: nextHeight };
};

export const getStudioContainRect = (
  sourceSize: StudioCropFrameSize,
  outputSize: StudioCropFrameSize,
) => {
  const safeSourceWidth = Math.max(1, sourceSize.width);
  const safeSourceHeight = Math.max(1, sourceSize.height);
  const safeOutputWidth = Math.max(1, outputSize.width);
  const safeOutputHeight = Math.max(1, outputSize.height);
  const scale = Math.min(
    safeOutputWidth / safeSourceWidth,
    safeOutputHeight / safeSourceHeight,
  );
  const width = safeSourceWidth * scale;
  const height = safeSourceHeight * scale;

  return {
    left: (safeOutputWidth - width) / 2,
    top: (safeOutputHeight - height) / 2,
    width,
    height,
  };
};
