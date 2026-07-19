import { supabase } from "@/lib/supabase";
import type { ShopTemplate, TemplateArtist } from "@/types/shop";
import { NextRequest, NextResponse } from "next/server";

type ShopTemplateRow = Omit<ShopTemplate, "template_artists"> & {
  templates: ShopTemplate["templates"] & {
    template_artists?: TemplateArtist[];
  };
};

export async function GET(request: NextRequest) {
  try {
    const sortOrder = request.nextUrl.searchParams.get("sort");
    if (sortOrder !== null && sortOrder !== "newest" && sortOrder !== "oldest") {
      return NextResponse.json(
        { error: "지원하지 않는 정렬 방식입니다." },
        { status: 400 }
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
      .eq("is_shop_visible", true)
      .eq("templates.status", "published")
      .order("created_at", { ascending: sortOrder === "oldest" });

    if (error) {
      console.error("Public shop template fetch failed:", error);
      return NextResponse.json(
        { error: "템플릿을 가져오는데 실패했습니다." },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as ShopTemplateRow[];
    const shopTemplates: ShopTemplate[] = rows.map((row) => ({
      ...row,
      template_artists: row.templates.template_artists ?? [],
    }));

    return NextResponse.json({ shopTemplates });
  } catch (error) {
    console.error("Public shop template API failed:", error);
    return NextResponse.json(
      { error: "템플릿을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
