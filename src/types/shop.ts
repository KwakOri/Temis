import { Tables } from "@/types/supabase";

export type Template = Tables<"templates"> & {
  template_products: Tables<"template_products">[];
};

export type SortOrder = "newest" | "oldest";
export type TabType = "shop" | "history";

export interface TemplateAccess {
  template_id: string;
}

export interface ShopTemplatesResponse {
  templates: Template[];
}

export interface UserTemplateAccessResponse {
  access: TemplateAccess[];
}
