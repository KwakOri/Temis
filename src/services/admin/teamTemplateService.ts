import { Database } from "@/types/supabase";

type TeamTemplate = Database["public"]["Tables"]["team_templates"]["Row"];
type Team = Database["public"]["Tables"]["teams"]["Row"];

export interface TeamTemplateWithRelations extends TeamTemplate {
  relations_team_template_and_team: Array<{
    id: string;
    team_id: string;
    teams: Team | null;
  }>;
  isConnected: boolean;
}

export interface CreateTeamTemplateData {
  name: string;
  descriptions?: string;
}

export interface ConnectTeamData {
  teamId: string;
}

export class AdminTeamTemplateService {
  private static baseUrl = "/api/admin";

  // Team Templates
  static async getTeamTemplates(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    teamTemplates: TeamTemplateWithRelations[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const url = `${this.baseUrl}/team-templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    console.log("Fetching team templates from:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("팀 템플릿 목록을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async createTeamTemplate(
    data: CreateTeamTemplateData
  ): Promise<TeamTemplate> {
    const response = await fetch(`${this.baseUrl}/team-templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "팀 템플릿 생성에 실패했습니다.");
    }

    const result = await response.json();
    return result.teamTemplate;
  }

  // 팀 연결
  static async connectTeam(
    teamTemplateId: string,
    data: ConnectTeamData
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/team-templates/${teamTemplateId}/connect`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "팀 연결에 실패했습니다.");
    }
  }

  // 팀 연결 해제
  static async disconnectTeam(
    teamTemplateId: string,
    teamId: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/team-templates/${teamTemplateId}/connect?teamId=${teamId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "팀 연결 해제에 실패했습니다.");
    }
  }

  // 팀 목록 가져오기 (연결할 팀 선택용)
  static async getTeams(): Promise<Team[]> {
    const response = await fetch(`${this.baseUrl}/teams`);

    if (!response.ok) {
      throw new Error("팀 목록을 가져오는데 실패했습니다.");
    }

    const result = await response.json();
    return result.teams || [];
  }
}
