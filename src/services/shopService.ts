import { supabase } from "@/lib/supabase";
import { SortOrder, ShopTemplate, TemplateArtist } from "@/types/shop";

type ShopTemplateRow = Omit<ShopTemplate, "template_artists"> & {
  templates: ShopTemplate["templates"] & {
    template_artists?: TemplateArtist[];
  };
};

export class ShopService {
  static async getPublicTemplates(
    sortOrder: SortOrder = "newest"
  ): Promise<ShopTemplate[]> {
    const { data, error } = await supabase
      .from("shop_templates")
      .select(`
        *,
        templates!inner (
          *,
          template_artists (
            *,
            artist:artists(*)
          )
        ),
        template_plans:template_plans!shop_template_id (*)
      `)
      .eq("is_shop_visible", true)
      .eq("templates.status", "published")
      .order("created_at", { ascending: sortOrder === "oldest" });

    if (error) {
      throw new Error(`템플릿을 가져오는데 실패했습니다: ${error.message}`);
    }

    const rows = (data || []) as ShopTemplateRow[];

    return rows.map((row) => ({
      ...row,
      template_artists: row.templates.template_artists || [],
    }));
  }

  static async getUserTemplateAccess(): Promise<string[]> {
    const response = await fetch("/api/user/template-access", {
      credentials: "include",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.error || "접근 권한을 가져오는데 실패했습니다.");
    }

    return result?.templateIds ?? [];
  }
}
