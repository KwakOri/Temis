import { V2TemplateCardStructure } from "@/types/time-table/template-render-config";

// Keep importer node order as-is (no role-based runtime dedupe).
// Day/status/entry branches must remain fully independent.
export const v2_getRenderableCardNodeOrder = (
  cardStructure: V2TemplateCardStructure
): string[] => {
  if (!Array.isArray(cardStructure.nodeOrder) || cardStructure.nodeOrder.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const ordered: string[] = [];

  cardStructure.nodeOrder.forEach((nodeId) => {
    if (seen.has(nodeId)) return;
    if (!cardStructure.nodes[nodeId]) return;
    seen.add(nodeId);
    ordered.push(nodeId);
  });

  return ordered;
};

