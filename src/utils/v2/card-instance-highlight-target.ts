import { V2TemplateVisibilityMode } from "@/types/time-table/template-render-config";

export type V2CardStatusGroupKey =
  | "always"
  | "online"
  | "multi"
  | "offline"
  | "offlineMemo";

const v2_CARD_STATUS_GROUP_SET = new Set<V2CardStatusGroupKey>([
  "always",
  "online",
  "multi",
  "offline",
  "offlineMemo",
]);

const v2_CARD_STATUS_LAYER_SEPARATOR = "::status:";
const v2_CARD_STATUS_LAYER_NODE_SEPARATOR = "::";

export const v2_resolveCardStatusGroupKey = (
  visibilityMode: V2TemplateVisibilityMode | undefined
): V2CardStatusGroupKey => {
  if (!visibilityMode || visibilityMode === "always") return "always";
  if (
    visibilityMode === "onlineOnly" ||
    visibilityMode === "onlineSingleOnly"
  ) {
    return "online";
  }
  if (visibilityMode === "onlineMultipleOnly") return "multi";
  if (visibilityMode === "offlineMemoOnly") return "offlineMemo";
  if (
    visibilityMode === "offlineOnly" ||
    visibilityMode === "offlineNoMemoOnly"
  ) {
    return "offline";
  }
  return "always";
};

export const v2_buildCardInstanceHighlightTarget = (
  instanceId: string
): string => {
  return `cardInstance:${instanceId}`;
};

export const v2_buildCardInstanceNodeHighlightTarget = ({
  instanceId,
  statusGroupKey,
  nodeLayerId,
}: {
  instanceId: string;
  statusGroupKey: V2CardStatusGroupKey;
  nodeLayerId: string;
}): string => {
  return `cardInstance:${instanceId}:status:${statusGroupKey}:node:${nodeLayerId}`;
};

export const v2_buildCardInstanceNodeLayerId = ({
  instanceLayerId,
  statusGroupKey,
  nodeLayerId,
}: {
  instanceLayerId: string;
  statusGroupKey: V2CardStatusGroupKey;
  nodeLayerId: string;
}): string => {
  return `${instanceLayerId}${v2_CARD_STATUS_LAYER_SEPARATOR}${statusGroupKey}${v2_CARD_STATUS_LAYER_NODE_SEPARATOR}${nodeLayerId}`;
};

export const v2_parseCardInstanceNodeLayerId = (
  candidate: string
):
  | {
      instanceLayerId: string;
      statusGroupKey: V2CardStatusGroupKey;
      nodeLayerId: string | null;
    }
  | null => {
  const markerIndex = candidate.indexOf(v2_CARD_STATUS_LAYER_SEPARATOR);
  if (markerIndex <= 0) return null;
  const instanceLayerId = candidate.slice(0, markerIndex).trim();
  if (!instanceLayerId) return null;

  const afterMarker = candidate
    .slice(markerIndex + v2_CARD_STATUS_LAYER_SEPARATOR.length)
    .trim();
  if (!afterMarker) return null;

  const nodeSepIndex = afterMarker.indexOf(v2_CARD_STATUS_LAYER_NODE_SEPARATOR);
  const statusRaw =
    nodeSepIndex >= 0 ? afterMarker.slice(0, nodeSepIndex) : afterMarker;
  if (!v2_CARD_STATUS_GROUP_SET.has(statusRaw as V2CardStatusGroupKey)) {
    return null;
  }

  const nodeLayerId =
    nodeSepIndex >= 0
      ? afterMarker.slice(nodeSepIndex + v2_CARD_STATUS_LAYER_NODE_SEPARATOR.length)
      : "";

  return {
    instanceLayerId,
    statusGroupKey: statusRaw as V2CardStatusGroupKey,
    nodeLayerId: nodeLayerId.trim().length > 0 ? nodeLayerId.trim() : null,
  };
};
