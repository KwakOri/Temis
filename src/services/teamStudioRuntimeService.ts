import type {
  TeamStudioOptions,
  TeamStudioWeek,
} from "@/types/team-studio-runtime";

async function read<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "팀 시간표 조회에 실패했습니다.");
  return result as T;
}
export const TeamStudioRuntimeService = {
  options: () => read<TeamStudioOptions>("/api/user/team-studio/options"),
  week: (templateId: string, teamId: string, weekStartDate: string) =>
    read<TeamStudioWeek>(
      `/api/user/team-studio/${encodeURIComponent(templateId)}/week?${new URLSearchParams({ teamId, weekStartDate })}`,
    ),
};
