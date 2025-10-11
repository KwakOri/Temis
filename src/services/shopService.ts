import { supabase } from "@/lib/supabase";
import { SortOrder, ShopTemplate } from "@/types/shop";

export class ShopService {
  static async getPublicTemplates(
    sortOrder: SortOrder = "newest"
  ): Promise<ShopTemplate[]> {
    const { data, error } = await supabase
      .from("shop_templates")
      .select(`
        *,
        templates!inner (*),
        template_plans:template_plans!shop_template_id (*)
      `)
      .eq("is_shop_visible", true)
      .order("created_at", { ascending: sortOrder === "oldest" });

    if (error) {
      throw new Error(`템플릿을 가져오는데 실패했습니다: ${error.message}`);
    }

    return data || [];
  }

  static async getUserTemplateAccess(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("template_access")
      .select("template_id")
      .eq("user_id", Number(userId));

    if (error) {
      throw new Error(`접근 권한을 가져오는데 실패했습니다: ${error.message}`);
    }

    return data?.map((item) => item.template_id) || [];
  }
}
