import {
  V2TemplateComputedBindingKey,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";

const v2_toTextValue = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

export const v2_findSceneNodeById = (
  nodes: V2TemplateSceneNode[] | undefined,
  id: string
): V2TemplateSceneNode | null => {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (node.id === id) return node;
    if (node.kind === "group" && node.children && node.children.length > 0) {
      stack.unshift(...node.children);
    }
  }

  return null;
};

export const v2_findSceneTextNodeById = (
  nodes: V2TemplateSceneNode[] | undefined,
  id: string
): V2TemplateSceneTextNode | null => {
  const node = v2_findSceneNodeById(nodes, id);
  if (!node) return null;
  if (node.kind === "text" || node.kind === "flexibleText") {
    return node;
  }
  return null;
};

export const v2_resolveSceneTextNodeValue = ({
  node,
  fallbackValue,
  computedValues,
  entrySource,
  entrySources,
  cardSource,
  globalSource,
}: {
  node: V2TemplateSceneTextNode;
  fallbackValue: string;
  computedValues?: Partial<Record<V2TemplateComputedBindingKey, string>>;
  entrySource?: Record<string, unknown>;
  entrySources?: Array<Record<string, unknown>>;
  cardSource?: Record<string, unknown>;
  globalSource?: Record<string, unknown>;
}): string => {
  if (node.binding.mode === "literal") {
    return node.binding.value || fallbackValue;
  }

  if (node.binding.mode === "computed") {
    const computed = computedValues?.[node.binding.key];
    return typeof computed === "string" ? computed : fallbackValue;
  }

  const resolvedEntrySource = (() => {
    if (node.binding.mode !== "field" || node.binding.scope !== "entry") {
      return entrySource;
    }
    const preferredIndex =
      node.binding.entrySelector?.mode === "index"
        ? node.binding.entrySelector.index
        : 0;
    const normalizedIndex = Number.isFinite(preferredIndex)
      ? Math.max(0, Math.floor(preferredIndex))
      : 0;
    return entrySources?.[normalizedIndex] ?? entrySource;
  })();

  const source =
    node.binding.scope === "entry"
      ? resolvedEntrySource
      : node.binding.scope === "card"
        ? cardSource
        : globalSource;
  const resolved = source ? v2_toTextValue(source[node.binding.key]) : null;
  return resolved ?? fallbackValue;
};
