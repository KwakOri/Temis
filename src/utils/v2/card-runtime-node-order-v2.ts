import { V2TemplateCardNode, V2TemplateCardStructure } from "@/types/time-table/template-render-config";

const normalizeCardRoleId = (nodeId: string): string => {
  const beforeInst = nodeId.split("__inst__")[0] ?? nodeId;
  return beforeInst
    .replace(/-multi-e\d+$/i, "")
    .replace(/-offline-memo$/i, "")
    .replace(/-offline$/i, "")
    .replace(/-multi$/i, "");
};

const instanceScoped = (nodeId: string): boolean => nodeId.includes("__inst__");

const nodePreferenceScore = (node: V2TemplateCardNode): number => {
  let score = 0;
  if (instanceScoped(node.id)) score += 100;
  if (typeof node.textStyleKey === "string") score += 10;
  if (typeof node.containerStyleKey === "string") score += 5;
  return score;
};

const dedupeByRoleAndVisibility = (
  nodesInOrder: V2TemplateCardNode[]
): Set<string> => {
  const chosen = new Map<string, V2TemplateCardNode>();

  nodesInOrder.forEach((node) => {
    const roleId = normalizeCardRoleId(node.id);
    const visibility = node.visibilityMode ?? "always";
    const key = `${roleId}::${visibility}`;

    const prev = chosen.get(key);
    if (!prev) {
      chosen.set(key, node);
      return;
    }

    const nextScore = nodePreferenceScore(node);
    const prevScore = nodePreferenceScore(prev);
    if (nextScore > prevScore) {
      chosen.set(key, node);
    }
  });

  return new Set(Array.from(chosen.values()).map((node) => node.id));
};

export const v2_getRenderableCardNodeOrder = (
  cardStructure: V2TemplateCardStructure
): string[] => {
  const nodesInOrder = cardStructure.nodeOrder
    .map((nodeId) => cardStructure.nodes[nodeId])
    .filter((node): node is V2TemplateCardNode => Boolean(node));

  if (nodesInOrder.length === 0) return cardStructure.nodeOrder;

  const keptNodeIds = dedupeByRoleAndVisibility(nodesInOrder);

  return cardStructure.nodeOrder.filter((nodeId) => keptNodeIds.has(nodeId));
};
