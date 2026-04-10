import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  V2TemplateLayerNode,
  V2TemplateSceneComponentInstanceNode,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";

export const v2_collectStructureTargetSectionMaps = (
  nodes: V2TemplateLayerNode[]
): {
  targetToSection: Record<string, string>;
  sectionToTarget: Record<string, V2TemplateHighlightTarget>;
  sectionToLabel: Record<string, string>;
  targetToLayerId: Partial<Record<V2TemplateHighlightTarget, string>>;
  sectionToLayerId: Record<string, string>;
  layerIdToNode: Record<string, V2TemplateLayerNode>;
} => {
  const targetToSection: Record<string, string> = {};
  const sectionToTarget: Record<string, V2TemplateHighlightTarget> = {};
  const sectionToLabel: Record<string, string> = {};
  const targetToLayerId: Partial<Record<V2TemplateHighlightTarget, string>> = {};
  const sectionToLayerId: Record<string, string> = {};
  const layerIdToNode: Record<string, V2TemplateLayerNode> = {};

const visit = (nodeList: V2TemplateLayerNode[]) => {
    nodeList.forEach((node) => {
      layerIdToNode[node.id] = node;
      if (node.target && node.sectionKey) {
        const section = node.sectionKey;
        targetToSection[node.target] = section;
        if (!sectionToTarget[section]) {
          sectionToTarget[section] = node.target;
        }
        if (!sectionToLabel[section]) {
          sectionToLabel[section] = node.label;
        }
        if (!targetToLayerId[node.target]) {
          targetToLayerId[node.target] = node.id;
        }
        if (!sectionToLayerId[section]) {
          sectionToLayerId[section] = node.id;
        }
      }
      if (node.children?.length) {
        visit(node.children);
      }
    });
  };

  visit(nodes);
  return {
    targetToSection,
    sectionToTarget,
    sectionToLabel,
    targetToLayerId,
    sectionToLayerId,
    layerIdToNode,
  };
};

export const v2_collectSceneTextNodes = (
  nodes: V2TemplateSceneNode[] | undefined
): V2TemplateSceneTextNode[] => {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];
  const results: V2TemplateSceneTextNode[] = [];
  const stack = [...nodes];

  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (
      (node.kind === "group" || node.kind === "cardCollection") &&
      node.children &&
      node.children.length > 0
    ) {
      stack.unshift(...node.children);
      continue;
    }
    if (node.kind === "text" || node.kind === "flexibleText") {
      results.push(node);
    }
  }

  return results;
};

export const v2_collectSceneNodesByLayerId = (
  nodes: V2TemplateSceneNode[] | undefined
): Map<string, V2TemplateSceneNode> => {
  const map = new Map<string, V2TemplateSceneNode>();
  if (!Array.isArray(nodes) || nodes.length === 0) return map;

  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (node.layerId) {
      map.set(node.layerId, node);
    }
    if (
      (node.kind === "group" || node.kind === "cardCollection") &&
      node.children &&
      node.children.length > 0
    ) {
      stack.unshift(...node.children);
    }
  }

  return map;
};

export const v2_collectSceneNodeIds = (nodes: V2TemplateSceneNode[]): Set<string> => {
  const ids = new Set<string>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    ids.add(node.id);
    if (
      (node.kind === "group" || node.kind === "cardCollection") &&
      node.children &&
      node.children.length > 0
    ) {
      stack.unshift(...node.children);
    }
  }
  return ids;
};

export const v2_collectLayerNodeIds = (nodes: V2TemplateLayerNode[]): Set<string> => {
  const ids = new Set<string>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    ids.add(node.id);
    if (node.children?.length) {
      stack.unshift(...node.children);
    }
  }
  return ids;
};

export const v2_createUniqueNodeId = (
  prefix: string,
  existingIds: Set<string>
): string => {
  let index = 1;
  let nextId = `${prefix}${index}`;
  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${prefix}${index}`;
  }
  return nextId;
};

export const v2_findSceneNodeContextById = ({
  nodes,
  nodeId,
}: {
  nodes: V2TemplateSceneNode[];
  nodeId: string;
}): {
  node: V2TemplateSceneNode;
  parentId: string | null;
  index: number;
} | null => {
  const visit = (
    list: V2TemplateSceneNode[],
    parentId: string | null
  ): { node: V2TemplateSceneNode; parentId: string | null; index: number } | null => {
    for (let index = 0; index < list.length; index += 1) {
      const node = list[index];
      if (node.id === nodeId) {
        return { node, parentId, index };
      }
      if (
        (node.kind !== "group" && node.kind !== "cardCollection") ||
        !node.children ||
        node.children.length === 0
      ) {
        continue;
      }
      const nested = visit(node.children, node.id);
      if (nested) return nested;
    }
    return null;
  };

  return visit(nodes, null);
};

export const v2_updateSceneNodeListByParentId = ({
  nodes,
  parentId,
  updater,
}: {
  nodes: V2TemplateSceneNode[];
  parentId: string | null;
  updater: (siblings: V2TemplateSceneNode[]) => V2TemplateSceneNode[];
}): { nodes: V2TemplateSceneNode[]; updated: boolean } => {
  if (parentId === null) {
    const nextRoot = updater(nodes);
    return {
      nodes: nextRoot,
      updated: nextRoot !== nodes,
    };
  }

  let updated = false;
  const visit = (list: V2TemplateSceneNode[]): V2TemplateSceneNode[] => {
    let changed = false;
    const nextList = list.map((node) => {
      if (node.kind === "group") {
        const currentChildren = node.children ?? [];
        if (node.id === parentId) {
          const nextChildren = updater(currentChildren);
          if (nextChildren !== currentChildren) {
            changed = true;
            updated = true;
            return {
              ...node,
              children: nextChildren,
            };
          }
          return node;
        }
        if (currentChildren.length > 0) {
          const nextChildren = visit(currentChildren);
          if (nextChildren !== currentChildren) {
            changed = true;
            return {
              ...node,
              children: nextChildren,
            };
          }
        }
        return node;
      }

      if (node.kind === "cardCollection") {
        const currentChildren = node.children ?? [];
        if (node.id === parentId) {
          const nextChildrenCandidate = updater(currentChildren).filter(
            (
              child
            ): child is V2TemplateSceneComponentInstanceNode =>
              child.kind === "componentInstance"
          );
          const isSameChildren =
            nextChildrenCandidate.length === currentChildren.length &&
            nextChildrenCandidate.every((child, index) => child === currentChildren[index]);
          if (!isSameChildren) {
            changed = true;
            updated = true;
            return {
              ...node,
              children: nextChildrenCandidate,
            };
          }
        }
      }
      return node;
    });
    return changed ? nextList : list;
  };

  const nextNodes = visit(nodes);
  return {
    nodes: nextNodes,
    updated,
  };
};

export const v2_findLayerNodeContextById = ({
  nodes,
  nodeId,
}: {
  nodes: V2TemplateLayerNode[];
  nodeId: string;
}): {
  node: V2TemplateLayerNode;
  parentId: string | null;
  index: number;
} | null => {
  const visit = (
    list: V2TemplateLayerNode[],
    parentId: string | null
  ): { node: V2TemplateLayerNode; parentId: string | null; index: number } | null => {
    for (let index = 0; index < list.length; index += 1) {
      const node = list[index];
      if (node.id === nodeId) {
        return { node, parentId, index };
      }
      if (!node.children?.length) continue;
      const nested = visit(node.children, node.id);
      if (nested) return nested;
    }
    return null;
  };

  return visit(nodes, null);
};

export const v2_updateLayerNodeListByParentId = ({
  nodes,
  parentId,
  updater,
}: {
  nodes: V2TemplateLayerNode[];
  parentId: string | null;
  updater: (siblings: V2TemplateLayerNode[]) => V2TemplateLayerNode[];
}): { nodes: V2TemplateLayerNode[]; updated: boolean } => {
  if (parentId === null) {
    const nextRoot = updater(nodes);
    return {
      nodes: nextRoot,
      updated: nextRoot !== nodes,
    };
  }

  let updated = false;
  const visit = (list: V2TemplateLayerNode[]): V2TemplateLayerNode[] => {
    let changed = false;
    const nextList = list.map((node) => {
      if (node.id === parentId) {
        const nextChildren = updater(node.children ?? []);
        if (nextChildren !== (node.children ?? [])) {
          changed = true;
          updated = true;
          return {
            ...node,
            children: nextChildren,
          };
        }
        return node;
      }
      if (node.children?.length) {
        const nextChildren = visit(node.children);
        if (nextChildren !== node.children) {
          changed = true;
          return {
            ...node,
            children: nextChildren,
          };
        }
      }
      return node;
    });
    return changed ? nextList : list;
  };

  const nextNodes = visit(nodes);
  return {
    nodes: nextNodes,
    updated,
  };
};

export const v2_collectSceneNodeStyleKeys = (node: V2TemplateSceneNode): string[] => {
  if (node.kind === "group") {
    return node.children.flatMap((child) => v2_collectSceneNodeStyleKeys(child));
  }
  if (node.kind === "cardCollection" || node.kind === "componentInstance") {
    return [];
  }
  if (node.kind === "asset") {
    return node.styleKey ? [node.styleKey] : [];
  }
  return [
    node.containerStyleKey,
    ...(node.textStyleKey ? [node.textStyleKey] : []),
    ...(node.wrapperStyleKey ? [node.wrapperStyleKey] : []),
    ...(node.optionsKey ? [node.optionsKey] : []),
  ];
};

export const v2_updateLayerNodeLabelById = (
  nodes: V2TemplateLayerNode[],
  layerId: string,
  label: string
): V2TemplateLayerNode[] => {
  return nodes.map((node) => {
    if (node.id === layerId) {
      return {
        ...node,
        label,
      };
    }
    if (!node.children?.length) return node;
    return {
      ...node,
      children: v2_updateLayerNodeLabelById(node.children, layerId, label),
    };
  });
};

export const v2_mapSceneTextNodes = ({
  nodes,
  mapper,
}: {
  nodes: V2TemplateSceneNode[];
  mapper: (node: V2TemplateSceneTextNode) => V2TemplateSceneTextNode;
}): { nodes: V2TemplateSceneNode[]; updated: boolean } => {
  let updated = false;

  const visit = (node: V2TemplateSceneNode): V2TemplateSceneNode => {
    if (node.kind === "group") {
      const nextChildren = node.children.map(visit);
      const changed = nextChildren.some(
        (child, index) => child !== node.children[index]
      );
      if (!changed) return node;
      updated = true;
      return {
        ...node,
        children: nextChildren,
      };
    }

    if (node.kind !== "text" && node.kind !== "flexibleText") {
      return node;
    }

    const nextNode = mapper(node);
    if (nextNode !== node) {
      updated = true;
    }
    return nextNode;
  };

  const nextNodes = nodes.map(visit);
  return {
    nodes: updated ? nextNodes : nodes,
    updated,
  };
};

export const v2_updateSceneTextNodeById = ({
  nodes,
  nodeId,
  updater,
}: {
  nodes: V2TemplateSceneNode[];
  nodeId: string;
  updater: (node: V2TemplateSceneTextNode) => V2TemplateSceneTextNode;
}): {
  nodes: V2TemplateSceneNode[];
  updated: boolean;
  matchedNode: V2TemplateSceneTextNode | null;
} => {
  let matchedNode: V2TemplateSceneTextNode | null = null;
  const { nodes: nextNodes, updated } = v2_mapSceneTextNodes({
    nodes,
    mapper: (node) => {
      if (node.id !== nodeId) return node;
      matchedNode = node;
      return updater(node);
    },
  });
  return {
    nodes: updated ? nextNodes : nodes,
    updated,
    matchedNode,
  };
};

export const v2_updateSceneNodeById = ({
  nodes,
  nodeId,
  updater,
}: {
  nodes: V2TemplateSceneNode[];
  nodeId: string;
  updater: (node: V2TemplateSceneNode) => V2TemplateSceneNode;
}): {
  nodes: V2TemplateSceneNode[];
  updated: boolean;
  matchedNode: V2TemplateSceneNode | null;
} => {
  let updated = false;
  let matchedNode: V2TemplateSceneNode | null = null;

  const visit = (node: V2TemplateSceneNode): V2TemplateSceneNode => {
    if (node.kind === "group") {
      const nextChildren = node.children.map(visit);
      const childrenChanged = nextChildren.some(
        (child, index) => child !== node.children[index]
      );

      if (node.id !== nodeId) {
        if (!childrenChanged) return node;
        updated = true;
        return {
          ...node,
          children: nextChildren,
        };
      }

      matchedNode = node;
      const targetNode = updater(node);
      const nextGroup =
        targetNode.kind === "group"
          ? targetNode
          : {
              ...targetNode,
              kind: "group" as const,
              children: node.children,
            };
      const finalGroup =
        childrenChanged && nextGroup.kind === "group"
          ? {
              ...nextGroup,
              children: nextChildren,
            }
          : nextGroup;

      if (finalGroup !== node || childrenChanged) {
        updated = true;
      }
      return finalGroup;
    }

    if (node.id !== nodeId) return node;

    matchedNode = node;
    const nextNode = updater(node);
    if (nextNode !== node) {
      updated = true;
    }
    return nextNode;
  };

  const nextNodes = nodes.map(visit);
  return {
    nodes: updated ? nextNodes : nodes,
    updated,
    matchedNode,
  };
};
