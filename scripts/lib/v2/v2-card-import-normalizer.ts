type CardLayoutRecord = Record<string, unknown>;

type GraphNode = {
  id: string;
  type?: string;
  layerId?: string;
  parentId?: string | null;
  childIds: string[];
  styles?: {
    containerStyleKey?: string;
    textStyleKey?: string;
    wrapperStyleKey?: string;
    optionsKey?: string;
  };
};

type GraphComponentDefinition = {
  id: string;
  rootNodeId: string;
};

type ImportConfig = {
  graph: {
    nodes: Record<string, GraphNode>;
    componentDefinitions: Record<string, GraphComponentDefinition>;
  };
  layout: {
    card: Record<string, unknown>;
  };
};

type NormalizeSummary = {
  prunedLegacyNodes: number;
  hydratedStyleRecords: number;
  touchedRoots: number;
};

const CARD_ROLE_NODE_ID_REGEX =
  /^(online-background|multi-background|offline-background|offline-memo-background|main-title|sub-title|streaming-time|streaming-date|streaming-day)(-|$)/;
const CARD_STATUS_VARIANT_NODE_ID_REGEX =
  /-(multi(?:-e\\d+)?|offline(?:-memo)?)$/i;

const ROLE_STYLE_BASE: Record<
  string,
  {
    text?: string;
    container: string;
    wrapper?: string;
    options?: string;
  }
> = {
  "main-title": {
    text: "mainTitleTextStyle",
    container: "mainTitleContainer",
    wrapper: "mainTitleWrapperStyle",
    options: "mainTitleOptions",
  },
  "sub-title": {
    text: "subTitleTextStyle",
    container: "subTitleContainer",
    wrapper: "subTitleWrapperStyle",
    options: "subTitleOptions",
  },
  "streaming-time": {
    text: "streamingTimeStyle",
    container: "streamingTime",
  },
  "streaming-date": {
    text: "streamingDateStyle",
    container: "streamingDate",
  },
  "streaming-day": {
    text: "streamingDayStyle",
    container: "streamingDay",
  },
  "online-background": {
    container: "onlineBackgroundContainer",
  },
  "multi-background": {
    container: "multiBackgroundContainer",
  },
  "offline-background": {
    container: "offlineBackgroundContainer",
  },
  "offline-memo-background": {
    container: "offlineMemoBackgroundContainer",
  },
};

const statusSuffixFromNodeId = (nodeId: string): string => {
  if (nodeId.includes("-offline-memo")) return "OfflineMemo";
  if (nodeId.includes("-offline")) return "Offline";
  if (nodeId.includes("-multi-e1")) return "MultiE1";
  if (nodeId.includes("-multi-e0") || nodeId.includes("-multi")) return "MultiE0";
  return "";
};

const baseRoleFromNodeId = (nodeId: string): keyof typeof ROLE_STYLE_BASE | null => {
  const base = nodeId.split("__inst__")[0] ?? nodeId;
  if (base.startsWith("main-title")) return "main-title";
  if (base.startsWith("sub-title")) return "sub-title";
  if (base.startsWith("streaming-time")) return "streaming-time";
  if (base.startsWith("streaming-date")) return "streaming-date";
  if (base.startsWith("streaming-day")) return "streaming-day";
  if (base.startsWith("online-background")) return "online-background";
  if (base.startsWith("multi-background")) return "multi-background";
  if (base.startsWith("offline-background")) return "offline-background";
  if (base.startsWith("offline-memo-background")) return "offline-memo-background";
  return null;
};

const mergeStyleRecord = ({
  layoutCard,
  targetKey,
  fallbackKey,
}: {
  layoutCard: Record<string, unknown>;
  targetKey?: string;
  fallbackKey?: string;
}): boolean => {
  if (!targetKey || !fallbackKey) return false;
  const fallback = layoutCard[fallbackKey];
  if (!fallback || typeof fallback !== "object") return false;

  const target =
    layoutCard[targetKey] && typeof layoutCard[targetKey] === "object"
      ? (layoutCard[targetKey] as CardLayoutRecord)
      : (layoutCard[targetKey] = {} as CardLayoutRecord);
  const sanitizedFallback = {
    ...(fallback as CardLayoutRecord),
  };
  delete sanitizedFallback.rotateDeg;

  const before = JSON.stringify(target);
  layoutCard[targetKey] = {
    ...sanitizedFallback,
    ...(target as CardLayoutRecord),
  };
  const after = JSON.stringify(layoutCard[targetKey]);
  return before !== after;
};

const parseCardInstanceSuffix = (rootNodeId: string): string | null => {
  const match = rootNodeId.match(/__inst__([a-z]+_\d+)$/);
  return match?.[1] ?? null;
};

export const v2_normalizeCardImportGraph = (config: ImportConfig): NormalizeSummary => {
  const summary: NormalizeSummary = {
    prunedLegacyNodes: 0,
    hydratedStyleRecords: 0,
    touchedRoots: 0,
  };

  const cardDefinitions = Object.values(config.graph.componentDefinitions).filter((definition) =>
    definition.id.startsWith("card__inst__")
  );

  cardDefinitions.forEach((definition) => {
    const root = config.graph.nodes[definition.rootNodeId];
    if (!root || root.type !== "group") return;

    const instanceSuffix = parseCardInstanceSuffix(definition.rootNodeId);
    if (!instanceSuffix) return;

    const instanceToken = `__inst__${instanceSuffix}`;

    const nextChildIds: string[] = [];
    root.childIds.forEach((childId) => {
      const isCardRoleNode = CARD_ROLE_NODE_ID_REGEX.test(childId);
      const isInstanceScoped = childId.includes(instanceToken);
      const isStatusVariant = CARD_STATUS_VARIANT_NODE_ID_REGEX.test(childId);

      if (isCardRoleNode && !isInstanceScoped && !isStatusVariant) {
        const childNode = config.graph.nodes[childId];
        if (childNode?.parentId === root.id) {
          childNode.parentId = null;
        }
        delete config.graph.nodes[childId];
        summary.prunedLegacyNodes += 1;
        return;
      }
      nextChildIds.push(childId);
    });

    if (nextChildIds.length !== root.childIds.length) {
      root.childIds = nextChildIds;
      summary.touchedRoots += 1;
    }

    root.childIds.forEach((childId) => {
      const node = config.graph.nodes[childId];
      if (!node) return;
      const roleBase = baseRoleFromNodeId(node.id);
      if (!roleBase) return;

      const roleStyle = ROLE_STYLE_BASE[roleBase];
      const statusSuffix = statusSuffixFromNodeId(node.id);

      const textFallbackBase = roleStyle.text;
      const containerFallbackBase = roleStyle.container;
      const wrapperFallbackBase = roleStyle.wrapper;
      const optionsFallbackBase = roleStyle.options;

      if (
        mergeStyleRecord({
          layoutCard: config.layout.card,
          targetKey: node.styles?.textStyleKey,
          fallbackKey:
            typeof textFallbackBase === "string"
              ? `${textFallbackBase}${statusSuffix}`
              : undefined,
        })
      ) {
        summary.hydratedStyleRecords += 1;
      }

      if (
        mergeStyleRecord({
          layoutCard: config.layout.card,
          targetKey: node.styles?.containerStyleKey,
          fallbackKey:
            typeof containerFallbackBase === "string"
              ? `${containerFallbackBase}${statusSuffix}`
              : undefined,
        })
      ) {
        summary.hydratedStyleRecords += 1;
      }

      if (
        mergeStyleRecord({
          layoutCard: config.layout.card,
          targetKey: node.styles?.wrapperStyleKey,
          fallbackKey:
            typeof wrapperFallbackBase === "string"
              ? `${wrapperFallbackBase}${statusSuffix}`
              : undefined,
        })
      ) {
        summary.hydratedStyleRecords += 1;
      }

      if (
        mergeStyleRecord({
          layoutCard: config.layout.card,
          targetKey: node.styles?.optionsKey,
          fallbackKey:
            typeof optionsFallbackBase === "string"
              ? `${optionsFallbackBase}${statusSuffix}`
              : undefined,
        })
      ) {
        summary.hydratedStyleRecords += 1;
      }
    });
  });

  return summary;
};
