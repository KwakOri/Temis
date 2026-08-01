/**
 * 자동 크기 탐색이 상자 경계에 붙지 않도록 남기는 여유.
 *
 * 탐색은 상자에 맞는 최대 크기를 찾으므로 결과가 항상 맞춤 경계 직전이다. 그 상태에서는
 * 측정과 래스터화가 조금만 달라도 결과가 어긋난다. Phase 0A가 실제로 그것을 봤다. 제품
 * 경로로 두 라스터라이저를 비교했을 때 어긋난 장면은 모두 세로가 빡빡한 쪽이었다. 두 줄이
 * 상자 높이를 거의 채우는 제목과, 상자 높이가 줄 높이에 가까운 부제목이다.
 *
 * 그래서 여유를 가로와 세로에 모두 준다. 가로에만 주면 그 두 경우가 남는다.
 *
 * 값은 경계에서 떨어지기 위한 최소한이다. 크게 두면 글자가 눈에 띄게 작아진다. 늘리거나
 * 줄일 때는 스파이크 페이지의 장면 13·14로 다시 확인한다.
 */
export const STUDIO_TEXT_FIT_MARGIN_PX = 1;

export interface StudioTextFitBounds {
  width: number;
  height: number;
}

/**
 * 맞춤 판정에 쓸 경계를 정한다.
 *
 * 여유를 뺀 뒤에도 최소 1px은 남긴다. 0이나 음수가 되면 어떤 크기도 맞지 않아 탐색이 최소
 * 크기까지 내려가고, 사용자에게는 글자가 갑자기 작아진 것으로 보인다. 좁은 상자에서 실제로
 * 일어날 수 있다.
 */
export const getStudioTextFitBounds = ({
  width,
  height,
  margin = STUDIO_TEXT_FIT_MARGIN_PX,
}: {
  width: number;
  height: number;
  margin?: number;
}): StudioTextFitBounds => {
  const safeMargin = Number.isFinite(margin) ? Math.max(margin, 0) : 0;

  return {
    width: Math.max(1, width - safeMargin),
    height: Math.max(1, height - safeMargin),
  };
};
