import type { StudioInputScope } from "@/types/template-studio";

/** 입력 범위를 목록에 보여줄 순서. 넓은 범위부터 좁은 범위로 둔다. */
export const STUDIO_INPUT_SCOPE_OPTIONS: StudioInputScope[] = [
  "global",
  "day",
  "entry",
];

/** 입력 범위의 표시 이름. */
export const getStudioInputScopeLabel = (scope: StudioInputScope): string => {
  if (scope === "global") return "Global";
  if (scope === "day") return "Day";
  return "Entry";
};
