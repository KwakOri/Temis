import { TDefaultCard } from "@/types/time-table/data";
import {
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_getRuntimeLayerTree } from "@/utils/v2/template-graph-layers-runtime";
import { v2_parseDayKey } from "@/utils/v2/template-render-config";

const v2_collectLayerTargetById = (
  nodes: V2TemplateLayerNode[]
): Record<string, string> => {
  const next: Record<string, string> = {};
  const stack = [...nodes];

  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (node.target) {
      next[node.id] = node.target;
    }
    if (node.children?.length) {
      stack.unshift(...node.children);
    }
  }

  return next;
};

const v2_createRootLayerZIndexById = (
  runtimeLayerTree: V2TemplateLayerNode[]
): Record<string, number> => {
  const next: Record<string, number> = {};
  const total = runtimeLayerTree.length;
  runtimeLayerTree.forEach((node, index) => {
    next[node.id] = (total - index) * 10;
  });
  return next;
};

const v2_createDataIndexByDayKey = (
  data: TDefaultCard[]
): Record<string, number> => {
  const map: Record<string, number> = {};
  data.forEach((card, index) => {
    const dayKey = v2_parseDayKey(card.day);
    if (!dayKey) return;
    if (map[dayKey] !== undefined) return;
    map[dayKey] = index;
  });
  return map;
};

const v2_resolveMemoTextFallback = (
  renderConfig: V2TemplateRenderConfig
): string => {
  const memoField = renderConfig.formSchema.fields.find((field) => {
    return field.scope === "global" && field.key === "memoText";
  });
  if (!memoField) return "";
  if (
    typeof memoField.defaultValue === "string" &&
    memoField.defaultValue.trim().length > 0
  ) {
    return memoField.defaultValue;
  }
  return memoField.placeholder ?? "";
};

export interface V2ResolvedRuntimeSceneModel {
  runtimeLayerTree: V2TemplateLayerNode[];
  layerTargetMap: Record<string, string>;
  rootLayerZIndexById: Record<string, number>;
  memoTextFallback: string;
  dataIndexByDayKey: Record<string, number>;
  firstCard: Record<string, unknown> | undefined;
  firstEntry: Record<string, unknown> | undefined;
  firstCardOffline: boolean;
  firstCardEntryCount: number;
  resolveStyleRecordByKey: (key?: string) => unknown;
}

export const v2_resolveRuntimeSceneModel = ({
  renderConfig,
  data,
}: {
  renderConfig: V2TemplateRenderConfig;
  data: TDefaultCard[];
}): V2ResolvedRuntimeSceneModel => {
  const runtimeLayerTree = v2_getRuntimeLayerTree(renderConfig);
  const layerTargetMap = v2_collectLayerTargetById(runtimeLayerTree);
  const rootLayerZIndexById = v2_createRootLayerZIndexById(runtimeLayerTree);
  const memoTextFallback = v2_resolveMemoTextFallback(renderConfig);
  const dataIndexByDayKey = v2_createDataIndexByDayKey(data);

  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const sceneLayoutRecord = renderConfig.layout.scene as Record<string, unknown>;

  const resolveStyleRecordByKey = (key?: string): unknown => {
    if (!key) return {};
    if (sceneLayoutRecord[key] && typeof sceneLayoutRecord[key] === "object") {
      return sceneLayoutRecord[key];
    }
    if (cardLayoutRecord[key] && typeof cardLayoutRecord[key] === "object") {
      return cardLayoutRecord[key];
    }
    if (layoutRecord[key] && typeof layoutRecord[key] === "object") {
      return layoutRecord[key];
    }
    return {};
  };

  const firstCard = data[0] as Record<string, unknown> | undefined;
  const firstEntry = (
    firstCard?.entries as Record<string, unknown>[] | undefined
  )?.[0];
  const firstCardOffline = Boolean(firstCard?.isOffline);
  const firstCardEntryCount = Math.max(
    1,
    Array.isArray(firstCard?.entries) ? firstCard.entries.length : 0
  );

  return {
    runtimeLayerTree,
    layerTargetMap,
    rootLayerZIndexById,
    memoTextFallback,
    dataIndexByDayKey,
    firstCard,
    firstEntry,
    firstCardOffline,
    firstCardEntryCount,
    resolveStyleRecordByKey,
  };
};
