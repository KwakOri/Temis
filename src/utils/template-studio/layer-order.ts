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
/**
 * 접힌 묶음 위에 끌고 머물 때 저절로 펼치기까지 기다리는 시간.
 *
 * 지나가는 길에 스치기만 해도 펼쳐지면 트리가 출렁여서 놓을 자리를 못 찾는다.
 * 카드와 시간표가 같은 시간을 쓴다.
 */
export const STUDIO_LAYER_AUTO_EXPAND_DELAY_MS = 550;
/**
 * 접힘 목록에서 한 레이어를 뺀다.
 *
 * 이미 펼쳐져 있으면 받은 배열을 그대로 돌려준다. 자동 펼침은 끌고 있는 동안
 * 여러 번 불리므로, 바뀐 것이 없을 때 새 배열을 만들면 트리가 계속 다시 그려진다.
 */
export const expandStudioCollapsedLayerId = (
  collapsedIds: string[],
  id: string,
): string[] =>
  collapsedIds.includes(id)
    ? collapsedIds.filter((collapsedId) => collapsedId !== id)
    : collapsedIds;
