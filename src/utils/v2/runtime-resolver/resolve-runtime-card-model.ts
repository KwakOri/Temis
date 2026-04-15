import { TDefaultCard } from "@/types/time-table/data";
import { V2TemplateSceneComponentInstanceNode } from "@/types/time-table/template-render-config";

export interface V2ResolvedRuntimeCardInstance {
  dataIndex: number;
  cardData: TDefaultCard;
  weekDate: Date;
}

export const v2_resolveRuntimeCardInstance = ({
  node,
  data,
  weekDates,
  dataIndexByDayKey,
}: {
  node: V2TemplateSceneComponentInstanceNode;
  data: TDefaultCard[];
  weekDates: Date[];
  dataIndexByDayKey: Record<string, number>;
}): V2ResolvedRuntimeCardInstance | null => {
  const dayIndex = dataIndexByDayKey[node.dayKey];
  const parsedInstanceIndex = Number.parseInt(node.instanceId, 10);
  const dataIndex =
    dayIndex !== undefined
      ? dayIndex
      : Number.isFinite(parsedInstanceIndex) && parsedInstanceIndex >= 0
        ? parsedInstanceIndex
        : 0;

  const cardData = data[dataIndex];
  const weekDate = weekDates[dataIndex];
  if (!cardData || !weekDate) return null;

  return {
    dataIndex,
    cardData,
    weekDate,
  };
};
