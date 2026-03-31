import { Tables } from "@/types/supabase";

type Template = Tables<"templates">;
type TemplatePlan = Tables<"template_plans">;

export interface UserTemplate {
  id: string | number;
  access_level: "read" | "write" | "admin";
  granted_at: string | null;
  templates: Template;
  template_plan: TemplatePlan | null;
  access_source?: "purchase" | "artist";
}

export interface GetUserTemplatesResponse {
  purchase_templates: UserTemplate[];
  artist_templates: UserTemplate[];
  total_purchase?: number;
  total_artist?: number;
  total?: number;
}

interface RawUserTemplate {
  id: string | number;
  access_level: "read" | "write" | "admin";
  granted_at: string | null;
  templates: Template;
  template_plan: TemplatePlan | null;
}

interface RawGetUserTemplatesResponse {
  purchase_templates: RawUserTemplate[];
  artist_templates: RawUserTemplate[];
  total_purchase?: number;
  total_artist?: number;
  total?: number;
}

export class UserService {
  private static baseUrl = "/api/user";

  static async getUserTemplates(): Promise<GetUserTemplatesResponse> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("템플릿 목록을 가져올 수 없습니다.");
    }

    const raw = (await response.json()) as RawGetUserTemplatesResponse;

    const purchaseTemplates = (raw.purchase_templates || []).map(
      (item) => ({
        ...item,
        access_source: "purchase" as const,
      })
    );

    const artistTemplates = (raw.artist_templates || []).map((item) => ({
      ...item,
      access_source: "artist" as const,
    }));

    return {
      purchase_templates: purchaseTemplates,
      artist_templates: artistTemplates,
      total_purchase: raw.total_purchase ?? purchaseTemplates.length,
      total_artist: raw.total_artist ?? artistTemplates.length,
      total: raw.total ?? purchaseTemplates.length + artistTemplates.length,
    };
  }
}
