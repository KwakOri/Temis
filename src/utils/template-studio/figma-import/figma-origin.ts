import type {
  FigmaOriginComponentRef,
  FigmaNormalizedNode,
  StudioFigmaGridVariantStatus,
} from "@/types/template-studio-figma";

type FigmaComponentMetadata = {
  id?: string;
  node_id?: string;
  nodeId?: string;
  name?: string;
  componentSetId?: string;
  component_set_id?: string;
};

type FigmaComponentSetMetadata = {
  id?: string;
  node_id?: string;
  nodeId?: string;
  name?: string;
};

const metadataId = (metadata: FigmaComponentMetadata | FigmaComponentSetMetadata, fallback: string) =>
  metadata.id ?? metadata.node_id ?? metadata.nodeId ?? fallback;

export const resolveFigmaOriginComponent = (input: {
  instance: Pick<FigmaNormalizedNode, "componentId">;
  components: Record<string, FigmaComponentMetadata>;
  componentSets: Record<string, FigmaComponentSetMetadata>;
}): FigmaOriginComponentRef | null => {
  const componentId = input.instance.componentId;
  if (!componentId) return null;
  const component = input.components[componentId];
  if (!component) return null;
  const componentSetNodeId = component.componentSetId ?? component.component_set_id;
  if (!componentSetNodeId || !component.name) return null;
  const componentSet = input.componentSets[componentSetNodeId];
  if (!componentSet) return null;
  return {
    componentId,
    componentNodeId: metadataId(component, componentId),
    componentSetNodeId,
    componentName: component.name,
    componentSetName: componentSet.name,
  };
};

const statusValues = (value: unknown, key = ""): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([entryKey, entryValue]) => {
    const normalizedKey = entryKey.toLowerCase();
    if (["status", "variantstatus", "variant_status", "variant"].includes(normalizedKey)) {
      if (typeof entryValue === "string") return [entryValue];
      if (entryValue && typeof entryValue === "object" && !Array.isArray(entryValue)) {
        const nestedValue = (entryValue as Record<string, unknown>).value;
        return typeof nestedValue === "string" ? [nestedValue] : [];
      }
      return [];
    }
    return key === "" ? statusValues(entryValue, entryKey) : [];
  });
};

export const inferFigmaGridVariantStatus = (input: unknown): StudioFigmaGridVariantStatus | null => {
  const values = statusValues(input).map((value) => value.trim().toLowerCase());
  if (values.length === 0 || values.some((value) => !["online", "offline"].includes(value))) return null;
  const unique = new Set(values);
  return unique.size === 1 ? values[0] as StudioFigmaGridVariantStatus : null;
};

export const groupFigmaGridPlacements = (input: {
  placements: Array<{ instance: Pick<FigmaNormalizedNode, "id">; origin: FigmaOriginComponentRef }>;
}) => {
  const groups: Record<string, {
    componentSetNodeId: string;
    origins: FigmaOriginComponentRef[];
    placementInstanceIds: string[];
  }> = {};
  for (const placement of input.placements) {
    const key = placement.origin.componentSetNodeId;
    const group = groups[key] ??= { componentSetNodeId: key, origins: [], placementInstanceIds: [] };
    if (!group.origins.some((origin) => origin.componentId === placement.origin.componentId)) {
      group.origins.push(placement.origin);
    }
    if (!group.placementInstanceIds.includes(placement.instance.id)) {
      group.placementInstanceIds.push(placement.instance.id);
    }
  }
  return groups;
};
