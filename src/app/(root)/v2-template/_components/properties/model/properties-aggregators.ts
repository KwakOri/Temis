import {
  V2TemplateDayKey,
  V2TemplateRenderConfig,
  V2TemplateSceneNode,
  v2_TEMPLATE_DAY_KEYS,
} from "@/types/time-table/template-render-config";
import { v2_resolveDayLabelByKey } from "@/utils/v2/template-render-config";

type V2CardComponentInstanceSummary = {
  instanceId: string;
  label: string;
  dayKey?: V2TemplateDayKey;
};

export const v2_collectCardComponentInstances = ({
  componentId,
  sceneNodes,
  dayLabelFormat,
  streamingDayFormat,
  weekdayOption,
  additionalInstanceIds = [],
}: {
  componentId: string | null;
  sceneNodes: V2TemplateSceneNode[];
  dayLabelFormat: V2TemplateRenderConfig["dayLabelFormat"];
  streamingDayFormat: V2TemplateRenderConfig["streamingDayFormat"];
  weekdayOption: V2TemplateRenderConfig["weekdayOption"];
  additionalInstanceIds?: string[];
}): V2CardComponentInstanceSummary[] => {
  if (!componentId) return [];

  const collected: V2CardComponentInstanceSummary[] = [];
  const seenInstanceIds = new Set<string>();
  const pushInstance = ({
    instanceId,
    dayKey,
    fallbackLabel,
  }: {
    instanceId: string;
    dayKey?: V2TemplateDayKey;
    fallbackLabel: string;
  }) => {
    const key = instanceId.trim();
    if (!key || seenInstanceIds.has(key)) return;
    seenInstanceIds.add(key);
    const dayLabel =
      dayKey &&
      v2_resolveDayLabelByKey({
        dayKey,
        dayLabelFormat,
        streamingDayFormat,
        fallbackWeekdayOption: weekdayOption,
      });
    collected.push({
      instanceId: key,
      dayKey,
      label: dayLabel ? `${dayLabel} (${key})` : fallbackLabel,
    });
  };

  const visit = (nodes: V2TemplateSceneNode[]) => {
    nodes.forEach((node) => {
      if (node.kind === "componentInstance") {
        if (node.componentId === componentId) {
          pushInstance({
            instanceId: node.instanceId,
            dayKey: node.dayKey,
            fallbackLabel: node.label || `Card ${node.instanceId}`,
          });
        }
        return;
      }
      if (node.kind === "cardCollection") {
        (node.children ?? []).forEach((instanceNode) => {
          if (instanceNode.componentId !== componentId) return;
          pushInstance({
            instanceId: instanceNode.instanceId,
            dayKey: instanceNode.dayKey,
            fallbackLabel: instanceNode.label || `Card ${instanceNode.instanceId}`,
          });
        });
        return;
      }
      if (node.kind === "group") {
        visit(node.children);
      }
    });
  };
  visit(sceneNodes);

  additionalInstanceIds.forEach((instanceId) => {
    pushInstance({
      instanceId,
      fallbackLabel: `Card ${instanceId}`,
    });
  });

  const dayKeyOrder = new Map(
    v2_TEMPLATE_DAY_KEYS.map((dayKey, index) => [dayKey, index] as const)
  );
  return [...collected].sort((left, right) => {
    const leftDayOrder =
      typeof left.dayKey === "string" ? dayKeyOrder.get(left.dayKey) : undefined;
    const rightDayOrder =
      typeof right.dayKey === "string"
        ? dayKeyOrder.get(right.dayKey)
        : undefined;
    if (
      typeof leftDayOrder === "number" &&
      typeof rightDayOrder === "number" &&
      leftDayOrder !== rightDayOrder
    ) {
      return leftDayOrder - rightDayOrder;
    }
    const leftNumeric = Number.parseInt(left.instanceId, 10);
    const rightNumeric = Number.parseInt(right.instanceId, 10);
    if (Number.isFinite(leftNumeric) && Number.isFinite(rightNumeric)) {
      return leftNumeric - rightNumeric;
    }
    return left.instanceId.localeCompare(right.instanceId);
  });
};

export const v2_collectCardComponentInstanceDiagnostics = ({
  componentId,
  sceneNodes,
}: {
  componentId: string | null;
  sceneNodes: V2TemplateSceneNode[];
}): {
  duplicateInstanceIds: string[];
  duplicateDayKeys: V2TemplateDayKey[];
  missingDayKeys: V2TemplateDayKey[];
} => {
  if (!componentId) {
    return {
      duplicateInstanceIds: [],
      duplicateDayKeys: [],
      missingDayKeys: [],
    };
  }

  const instanceIdCounter = new Map<string, number>();
  const dayKeyCounter = new Map<V2TemplateDayKey, number>();
  const collect = (nodes: V2TemplateSceneNode[]) => {
    nodes.forEach((node) => {
      if (node.kind === "componentInstance") {
        if (node.componentId !== componentId) return;
        const instanceId = node.instanceId.trim();
        if (instanceId) {
          instanceIdCounter.set(
            instanceId,
            (instanceIdCounter.get(instanceId) ?? 0) + 1
          );
        }
        dayKeyCounter.set(node.dayKey, (dayKeyCounter.get(node.dayKey) ?? 0) + 1);
        return;
      }
      if (node.kind === "cardCollection") {
        (node.children ?? []).forEach((instanceNode) => {
          if (instanceNode.componentId !== componentId) return;
          const instanceId = instanceNode.instanceId.trim();
          if (instanceId) {
            instanceIdCounter.set(
              instanceId,
              (instanceIdCounter.get(instanceId) ?? 0) + 1
            );
          }
          dayKeyCounter.set(
            instanceNode.dayKey,
            (dayKeyCounter.get(instanceNode.dayKey) ?? 0) + 1
          );
        });
        return;
      }
      if (node.kind === "group") {
        collect(node.children);
      }
    });
  };
  collect(sceneNodes);

  const duplicateInstanceIds = Array.from(instanceIdCounter.entries())
    .filter(([, count]) => count > 1)
    .map(([instanceId]) => instanceId)
    .sort();
  const duplicateDayKeys = Array.from(dayKeyCounter.entries())
    .filter(([, count]) => count > 1)
    .map(([dayKey]) => dayKey)
    .sort((left, right) => {
      const leftIndex = v2_TEMPLATE_DAY_KEYS.indexOf(left);
      const rightIndex = v2_TEMPLATE_DAY_KEYS.indexOf(right);
      return leftIndex - rightIndex;
    });
  const missingDayKeys = v2_TEMPLATE_DAY_KEYS.filter(
    (dayKey) => !dayKeyCounter.has(dayKey)
  );

  return {
    duplicateInstanceIds,
    duplicateDayKeys,
    missingDayKeys,
  };
};

export const v2_collectSceneNodeParentIdById = (
  sceneNodes: V2TemplateSceneNode[]
): Record<string, string | null> => {
  const next: Record<string, string | null> = {};
  const visit = (nodes: V2TemplateSceneNode[], parentId: string | null) => {
    nodes.forEach((node) => {
      next[node.id] = parentId;
      if (node.kind === "group") {
        visit(node.children, node.id);
      }
    });
  };
  visit(sceneNodes, null);
  return next;
};

export const v2_collectSceneNodeDescendantIdsById = (
  sceneNodes: V2TemplateSceneNode[]
): Record<string, Set<string>> => {
  const next: Record<string, Set<string>> = {};

  const collectDescendants = (node: V2TemplateSceneNode): Set<string> => {
    if (node.kind !== "group" || !node.children) {
      next[node.id] = new Set();
      return next[node.id];
    }

    const descendants = new Set<string>();
    node.children.forEach((child) => {
      descendants.add(child.id);
      const childDescendants = collectDescendants(child);
      childDescendants.forEach((id) => descendants.add(id));
    });
    next[node.id] = descendants;
    return descendants;
  };

  sceneNodes.forEach((rootNode) => {
    collectDescendants(rootNode);
  });

  return next;
};

export const v2_collectSceneGroupParentOptions = (
  sceneNodes: V2TemplateSceneNode[]
): Array<{ value: string | null; label: string }> => {
  const options: Array<{ value: string | null; label: string }> = [
    { value: null, label: "(루트)" },
  ];

  const visit = (nodes: V2TemplateSceneNode[], depth: number) => {
    nodes.forEach((node) => {
      if (node.kind !== "group" || !node.children) {
        return;
      }
      options.push({
        value: node.id,
        label: `${"  ".repeat(depth)}${node.label}`,
      });
      visit(node.children, depth + 1);
    });
  };

  visit(sceneNodes, 0);
  return options;
};
