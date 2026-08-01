export interface StudioViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StudioCanvasPoint {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * 지금 화면에 보이는 영역의 중앙에 해당하는 캔버스 좌표.
 *
 * 캔버스는 확대·축소와 밀기를 거쳐 화면에 놓이므로, 화면 중앙이 캔버스의 어느 점인지는
 * 두 사각형의 관계로 계산해야 한다. 새 객체를 지금 보고 있는 자리에 놓기 위해 쓴다.
 *
 * 캔버스를 화면 밖으로 밀어 둔 상태에서는 중앙이 캔버스 밖으로 나간다. 그대로 쓰면
 * 새 객체가 보이지 않는 곳에 생기고, 사용자에게는 추가가 안 된 것으로 읽힌다. 그래서
 * 캔버스 안으로 되돌린다.
 */
export const getStudioVisibleCanvasCenter = ({
  viewportRect,
  canvasRect,
  canvasWidth,
  canvasHeight,
  scale,
}: {
  viewportRect: StudioViewportRect;
  /** 확대·축소가 적용된 캔버스의 화면 위 사각형 */
  canvasRect: StudioViewportRect;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
}): StudioCanvasPoint => {
  if (!Number.isFinite(scale) || scale <= 0) {
    return { x: canvasWidth / 2, y: canvasHeight / 2 };
  }

  const viewportCenterX = viewportRect.left + viewportRect.width / 2;
  const viewportCenterY = viewportRect.top + viewportRect.height / 2;

  return {
    x: clamp((viewportCenterX - canvasRect.left) / scale, 0, canvasWidth),
    y: clamp((viewportCenterY - canvasRect.top) / scale, 0, canvasHeight),
  };
};
