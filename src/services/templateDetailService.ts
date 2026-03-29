import { supabase } from "@/lib/supabase";
import {
  PurchaseRequestData,
  PurchaseRequestResponse,
  TemplateArtist,
  ShopTemplateWithPlans,
} from "@/types/templateDetail";

type ShopTemplateDetailRow = Omit<ShopTemplateWithPlans, "template_artists"> & {
  templates: ShopTemplateWithPlans["templates"] & {
    template_artists?: TemplateArtist[];
  };
};

export class TemplateDetailService {
  static async getTemplateDetail(
    templateId: string
  ): Promise<ShopTemplateWithPlans> {
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
      .eq("template_id", templateId)
      .eq("is_shop_visible", true)
      .single();

    if (error) {
      throw new Error(`템플릿을 찾을 수 없습니다: ${error.message}`);
    }

    if (!data) {
      throw new Error("템플릿을 찾을 수 없습니다.");
    }

    const row = data as ShopTemplateDetailRow;

    return {
      ...row,
      template_artists: row.templates.template_artists || [],
    };
  }

  static async submitPurchaseRequest(
    requestData: PurchaseRequestData
  ): Promise<PurchaseRequestResponse> {
    const response = await fetch("/api/template-purchase-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "구매 신청 중 오류가 발생했습니다.");
    }

    return result;
  }
}
