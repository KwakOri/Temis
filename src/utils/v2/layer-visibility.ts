export const v2_isLayerHiddenByAliases = ({
  hiddenLayerIds,
  layerIds,
}: {
  hiddenLayerIds: Record<string, boolean>;
  layerIds: Array<string | null | undefined>;
}): boolean => {
  const candidates = Array.from(
    new Set(
      layerIds
        .filter((layerId): layerId is string => typeof layerId === "string")
        .map((layerId) => layerId.trim())
        .filter((layerId) => layerId.length > 0)
    )
  );
  if (candidates.length === 0) return false;

  const hiddenIds = Object.keys(hiddenLayerIds).filter(
    (layerId) => hiddenLayerIds[layerId] === true
  );
  if (hiddenIds.length === 0) return false;

  return hiddenIds.some((hiddenId) => {
    const normalizedHiddenId = hiddenId.trim();
    if (!normalizedHiddenId) return false;
    return candidates.some(
      (candidate) =>
        candidate === normalizedHiddenId ||
        candidate.startsWith(`${normalizedHiddenId}::`)
    );
  });
};
