import { Tables } from "@/types/supabase";

export type Artist = Tables<"artists">;
export type TemplateArtist = Tables<"template_artists"> & {
  artist: Artist | null;
};

// Shop template with joined template data and plans
export type ShopTemplate = Tables<"shop_templates"> & {
  templates: Tables<"templates">;
  template_plans: Tables<"template_plans">[];
  template_artists: TemplateArtist[];
};

export type SortOrder = "newest" | "oldest";
export type TabType = "shop" | "history";

export interface TemplateAccess {
  template_id: string;
}

export interface ShopTemplatesResponse {
  shopTemplates: ShopTemplate[];
}

export interface UserTemplateAccessResponse {
  access: TemplateAccess[];
}
