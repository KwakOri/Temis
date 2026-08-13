import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioBindingInputId } from "@/utils/template-studio/binding-resolver";

export interface ThumbnailStudioInputConsumerReference {
  id: string;
  nodeId: string;
  label: string;
  detail: string;
  locked: boolean;
}

const addConsumer = (
  consumers: Record<string, ThumbnailStudioInputConsumerReference[]>,
  inputId: string | null,
  node: StudioGraphNode,
  detail: string,
) => {
  if (!inputId) return;
  consumers[inputId] = [
    ...(consumers[inputId] ?? []),
    {
      id: `thumbnail:${node.id}:${detail}`,
      nodeId: node.id,
      label: node.label,
      detail,
      locked: Boolean(node.locked),
    },
  ];
};

/** Thumbnail graph만 훑어 global input의 연결 대상과 잠금 상태를 반환한다. */
export const collectThumbnailStudioInputConsumers = (
  document: StudioTemplateDocument,
): Record<string, ThumbnailStudioInputConsumerReference[]> => {
  const consumers: Record<string, ThumbnailStudioInputConsumerReference[]> = {};

  Object.values(document.graph.nodes).forEach((node) => {
    addConsumer(
      consumers,
      getStudioBindingInputId(node.binding),
      node,
      "binding",
    );
    Object.entries(node.assetSlots ?? {}).forEach(([slotName, slot]) => {
      if (slot.inputId) addConsumer(consumers, slot.inputId, node, slotName);
    });
  });

  return consumers;
};
