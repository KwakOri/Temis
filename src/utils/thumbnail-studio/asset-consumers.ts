import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";

export interface ThumbnailStudioAssetConsumerReference {
  id: string;
  assetId: string;
  nodeId: string | null;
  label: string;
  detail: string;
  locked: boolean;
}

const addConsumer = (
  consumers: Record<string, ThumbnailStudioAssetConsumerReference[]>,
  assetId: string | null | undefined,
  reference: Omit<ThumbnailStudioAssetConsumerReference, "assetId">,
) => {
  if (!assetId) return;
  consumers[assetId] = [
    ...(consumers[assetId] ?? []),
    { ...reference, assetId },
  ];
};

const addNodeAssetConsumers = (
  consumers: Record<string, ThumbnailStudioAssetConsumerReference[]>,
  node: StudioGraphNode,
) => {
  if (node.binding?.kind === "staticAsset") {
    addConsumer(consumers, node.binding.assetId, {
      id: `node:${node.id}:binding`,
      nodeId: node.id,
      label: node.label,
      detail: "Static image",
      locked: Boolean(node.locked),
    });
  }
  if (node.binding?.kind === "selectAsset") {
    Object.entries(node.binding.assetByOption).forEach(
      ([optionValue, assetId]) => {
        addConsumer(consumers, assetId, {
          id: `node:${node.id}:select:${optionValue}`,
          nodeId: node.id,
          label: node.label,
          detail: `Select option · ${optionValue}`,
          locked: Boolean(node.locked),
        });
      },
    );
  }
  Object.entries(node.assetSlots ?? {}).forEach(([slotName, slot]) => {
    addConsumer(consumers, slot.assetId, {
      id: `node:${node.id}:slot:${slotName}`,
      nodeId: node.id,
      label: node.label,
      detail: `Asset slot · ${slotName}`,
      locked: Boolean(node.locked),
    });
  });
  if (node.meta?.bindingFallback?.kind === "staticAsset") {
    addConsumer(consumers, node.meta.bindingFallback.assetId, {
      id: `node:${node.id}:fallback`,
      nodeId: node.id,
      label: node.label,
      detail: "Binding fallback",
      locked: Boolean(node.locked),
    });
  }
};

/** Thumbnail document 안의 모든 논리 asset ID 참조를 모은다. */
export const collectThumbnailStudioAssetConsumers = (
  document: StudioTemplateDocument,
): Record<string, ThumbnailStudioAssetConsumerReference[]> => {
  const consumers: Record<string, ThumbnailStudioAssetConsumerReference[]> = {};
  Object.values(document.graph.nodes).forEach((node) =>
    addNodeAssetConsumers(consumers, node),
  );

  const guides = [
    ["thumbnail-guide", document.domains?.thumbnail?.guide],
    ["cards-guide", document.resources?.cardsGuide],
    ["timetable-guide", document.resources?.timetableGuide],
  ] as const;
  guides.forEach(([id, guide]) => {
    addConsumer(consumers, guide?.assetId, {
      id,
      nodeId: null,
      label: "Guide",
      detail: id,
      locked: false,
    });
  });

  return consumers;
};
