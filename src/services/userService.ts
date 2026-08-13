import { Tables } from "@/types/supabase";
import {
  normalizeConsumerTemplate,
  type ConsumerTemplateSummary,
} from "@/utils/templates/consumer-template";

type Template = Tables<"templates">;
type TemplatePlan = Tables<"template_plans">;

type AccessSource = "purchase" | "artist";

interface RawUserTemplate {
  id: string | number;
  access_level: "read" | "write" | "admin";
  granted_at: string | null;
  templates: Template & { use_href: string };
  template_plan: TemplatePlan | null;
}

export interface UserTemplate extends RawUserTemplate {
  access_source: AccessSource;
  consumer: ConsumerTemplateSummary;
}

export interface GetUserTemplatesResponse {
  purchase_templates: UserTemplate[];
  artist_templates: UserTemplate[];
  total_purchase?: number;
  total_artist?: number;
  total?: number;
}

interface RawGetUserTemplatesResponse {
  purchase_templates: RawUserTemplate[];
  artist_templates: RawUserTemplate[];
  total_purchase?: number;
  total_artist?: number;
  total?: number;
}

const normalizeRows = (
  rows: RawUserTemplate[],
  accessSource: AccessSource,
): UserTemplate[] =>
  rows.flatMap((item) => {
    const row = { ...item, access_source: accessSource };
    const consumer = normalizeConsumerTemplate(row);
    return consumer ? [{ ...row, consumer }] : [];
  });

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
    const purchaseTemplates = normalizeRows(
      raw.purchase_templates || [],
      "purchase",
    );
    const artistTemplates = normalizeRows(raw.artist_templates || [], "artist");

    return {
      purchase_templates: purchaseTemplates,
      artist_templates: artistTemplates,
      total_purchase: purchaseTemplates.length,
      total_artist: artistTemplates.length,
      total: purchaseTemplates.length + artistTemplates.length,
    };
  }
}
