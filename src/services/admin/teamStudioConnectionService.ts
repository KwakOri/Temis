import type {
  TeamStudioConnection,
  TeamStudioTeamWeek,
} from "@/types/team-studio-runtime";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "팀 연결 처리에 실패했습니다.");
  return data as T;
}
const url = (id: string) =>
  `/api/admin/template-studio/templates/${encodeURIComponent(id)}/team-connection`;
export const TeamStudioConnectionService = {
  get: (id: string) =>
    request<{ connection: TeamStudioConnection | null }>(url(id)),
  save: (id: string, teamId: string, memberBindings: Record<string, number>) =>
    request<{ connection: TeamStudioConnection | null }>(url(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, memberBindings }),
    }),
  disconnect: (id: string) =>
    request<{ connection: null }>(url(id), { method: "DELETE" }),
  week: (id: string, teamId: string, weekStartDate: string) =>
    request<TeamStudioTeamWeek>(
      `${url(id)}/week?${new URLSearchParams({ teamId, weekStartDate })}`,
    ),
};
