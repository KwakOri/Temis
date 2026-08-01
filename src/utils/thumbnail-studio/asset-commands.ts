import type {
  StudioAsset,
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { createStudioThumbnailNode } from "@/utils/thumbnail-studio/node-defaults";
import type { StudioNodeInsertionPlan } from "@/utils/thumbnail-studio/node-defaults";
import { collectThumbnailStudioAssetConsumers } from "@/utils/thumbnail-studio/asset-consumers";

/** 검증과 decode가 끝난 asset만 document에 추가한다. */
export const applyThumbnailStudioAddAssets = (
  draft: StudioTemplateDocument,
  assets: readonly StudioAsset[],
): string[] => {
  const addedIds: string[] = [];
  assets.forEach((asset) => {
    if (!asset.id || !asset.src || draft.assets[asset.id]) return;
    draft.assets[asset.id] = { ...asset };
    addedIds.push(asset.id);
  });
  return addedIds;
};

export const applyThumbnailStudioRenameAsset = (
  draft: StudioTemplateDocument,
  assetId: string,
  label: string,
): boolean => {
  const asset = draft.assets[assetId];
  const nextLabel = label.trim();
  if (!asset || !nextLabel || asset.label === nextLabel) return false;
  asset.label = nextLabel;
  return true;
};

export const applyThumbnailStudioReplaceImageAsset = (
  draft: StudioTemplateDocument,
  nodeId: string,
  assetId: string,
): boolean => {
  const node = draft.graph.nodes[nodeId];
  if (!node || node.type !== "image" || node.locked || !draft.assets[assetId]) {
    return false;
  }
  node.binding = { kind: "staticAsset", assetId };
  if (node.meta?.bindingFallback) {
    const meta = { ...node.meta };
    delete meta.bindingFallback;
    node.meta = meta;
  }
  return true;
};

export interface ThumbnailStudioCropImageAssetOptions {
  nodeId: string;
  sourceAssetId: string;
  derivedAssetId: string;
  croppedImageSrc: string;
  width: number;
  height: number;
}

/**
 * 원본 asset은 그대로 두고, 선택 image node만 새 PNG asset으로 바꾼다.
 *
 * source binding을 다시 확인하는 이유는 crop modal이 열려 있는 동안 선택이나 asset
 * 교체가 바뀔 수 있기 때문이다. 이 검사가 없으면 오래된 modal의 결과가 다른 node를
 * 조용히 덮어쓸 수 있다.
 */
export const applyThumbnailStudioCropImageAsset = (
  draft: StudioTemplateDocument,
  {
    nodeId,
    sourceAssetId,
    derivedAssetId,
    croppedImageSrc,
    width,
    height,
  }: ThumbnailStudioCropImageAssetOptions,
): boolean => {
  const node = draft.graph.nodes[nodeId];
  const sourceAsset = draft.assets[sourceAssetId];
  if (
    !node ||
    node.type !== "image" ||
    node.locked ||
    node.binding?.kind !== "staticAsset" ||
    node.binding.assetId !== sourceAssetId ||
    !sourceAsset ||
    draft.assets[derivedAssetId] ||
    !derivedAssetId.trim() ||
    typeof croppedImageSrc !== "string" ||
    !croppedImageSrc.startsWith("data:image/") ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return false;
  }

  draft.assets[derivedAssetId] = {
    id: derivedAssetId,
    label: `${sourceAsset.label} crop`,
    src: croppedImageSrc,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    mimeType: "image/png",
  };

  return applyThumbnailStudioReplaceImageAsset(draft, nodeId, derivedAssetId);
};

export const applyThumbnailStudioAddImageNodeForAsset = ({
  draft,
  assetId,
  nodeId,
  styleId,
  plan,
}: {
  draft: StudioTemplateDocument;
  assetId: string;
  nodeId: string;
  styleId: string;
  plan: StudioNodeInsertionPlan;
}): StudioGraphNode | null => {
  const asset = draft.assets[assetId];
  if (
    !asset ||
    draft.graph.nodes[nodeId] ||
    draft.styles[styleId] ||
    (plan.parentId &&
      (!draft.graph.nodes[plan.parentId] ||
        draft.graph.nodes[plan.parentId]?.locked))
  ) {
    return null;
  }

  const { node, style } = createStudioThumbnailNode({
    nodeId,
    styleId,
    type: "image",
    label: asset.label,
    plan,
  });
  node.binding = { kind: "staticAsset", assetId };
  draft.styles[styleId] = style;
  draft.graph.nodes[nodeId] = node;
  const siblings = plan.parentId
    ? draft.graph.nodes[plan.parentId]?.childIds
    : draft.graph.rootNodeIds;
  siblings?.push(nodeId);
  return node;
};

export const applyThumbnailStudioDeleteUnusedAsset = (
  draft: StudioTemplateDocument,
  assetId: string,
): boolean => {
  if (!draft.assets[assetId]) return false;
  const consumers = collectThumbnailStudioAssetConsumers(draft)[assetId] ?? [];
  if (consumers.length > 0) return false;
  delete draft.assets[assetId];
  return true;
};

export const applyThumbnailStudioRemoveUnusedAssets = (
  draft: StudioTemplateDocument,
): string[] => {
  const consumers = collectThumbnailStudioAssetConsumers(draft);
  const removedIds = Object.keys(draft.assets).filter(
    (assetId) => (consumers[assetId] ?? []).length === 0,
  );
  removedIds.forEach((assetId) => delete draft.assets[assetId]);
  return removedIds;
};
