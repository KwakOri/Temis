import type { StudioGraphNodeType } from "@/types/template-studio";

/** 그래프 노드 종류의 표시 이름. */
export const getStudioGraphNodeTypeLabel = (
  type: StudioGraphNodeType,
): string => {
  if (type === "flexibleText") return "Auto Text";
  return type[0].toUpperCase() + type.slice(1);
};
