import { supabase } from "@/lib/supabase";
import type {
  ShopTemplateWithPlans,
  TemplateArtist,
} from "@/types/templateDetail";
import { NextRequest, NextResponse } from "next/server";

type ShopTemplateDetailRow = Omit<
  ShopTemplateWithPlans,
  "template_artists"
> & {
  templates: ShopTemplateWithPlans["templates"] & {
    template_artists?: TemplateArtist[];
  };
};

interface RouteContext {
  params: Promise<{ templateId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params;
    if (!templateId) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

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
      .eq("templates.status", "published")
      .single();

    if (error || !data) {
      if (error?.code !== "PGRST116") {
        console.error("Public shop template detail fetch failed:", error);
      }
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const row = data as ShopTemplateDetailRow;
    const template: ShopTemplateWithPlans = {
      ...row,
      template_artists: row.templates.template_artists ?? [],
    };

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Public shop template detail API failed:", error);
    return NextResponse.json(
      { error: "템플릿을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
