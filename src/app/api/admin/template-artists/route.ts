import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("template_id");

    if (!templateId) {
      return NextResponse.json(
        { error: "template_id는 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("template_artists")
      .select(
        `
        *,
        artist:artists(*)
      `
      )
      .eq("template_id", templateId)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      templateArtists: data || [],
    });
  } catch (error) {
    console.error("Template artists fetch error:", error);
    return NextResponse.json(
      { error: "템플릿 작가 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const { template_id, relations } = body as {
      template_id?: string;
      relations?: Array<{
        artist_id: string;
        role?: string;
        is_primary?: boolean;
        display_order?: number;
      }>;
    };

    if (!template_id) {
      return NextResponse.json(
        { error: "template_id는 필수입니다." },
        { status: 400 }
      );
    }

    const rawRelations = relations || [];
    const normalizedRelations = rawRelations.map((item, index) => ({
      artist_id: item.artist_id,
      role: item.role || "creator",
      is_primary: Boolean(item.is_primary),
      display_order: item.display_order ?? index,
    }));

    const primaryCount = normalizedRelations.filter((item) => item.is_primary).length;
    if (primaryCount > 1) {
      return NextResponse.json(
        { error: "대표 작가는 1명만 지정할 수 있습니다." },
        { status: 400 }
      );
    }

    if (normalizedRelations.length > 0 && primaryCount === 0) {
      normalizedRelations[0].is_primary = true;
    }

    const { error: deleteError } = await supabase
      .from("template_artists")
      .delete()
      .eq("template_id", template_id);

    if (deleteError) {
      throw deleteError;
    }

    if (normalizedRelations.length > 0) {
      const insertData: TablesInsert<"template_artists">[] = normalizedRelations.map(
        (item) => ({
          template_id,
          artist_id: item.artist_id,
          role: item.role,
          is_primary: item.is_primary,
          display_order: item.display_order,
        })
      );

      const { error: insertError } = await supabase
        .from("template_artists")
        .insert(insertData);

      if (insertError) {
        throw insertError;
      }
    }

    // 작가 연결이 모두 해제되면 판매 중 상태를 자동으로 중지
    let saleStoppedByUnlink = false;
    if (normalizedRelations.length === 0) {
      const { error: stopShopSaleError } = await supabase
        .from("shop_templates")
        .update({ is_shop_visible: false })
        .eq("template_id", template_id)
        .eq("is_shop_visible", true);

      if (stopShopSaleError) {
        throw stopShopSaleError;
      }

      const { error: stopTemplateSaleError } = await supabase
        .from("templates")
        .update({ is_shop_visible: false })
        .eq("id", template_id)
        .eq("is_shop_visible", true);

      if (stopTemplateSaleError) {
        throw stopTemplateSaleError;
      }

      saleStoppedByUnlink = true;
    }

    const { data: refreshed, error: fetchError } = await supabase
      .from("template_artists")
      .select(
        `
        *,
        artist:artists(*)
      `
      )
      .eq("template_id", template_id)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({
      success: true,
      templateArtists: refreshed || [],
      saleStoppedByUnlink,
    });
  } catch (error) {
    console.error("Template artists update error:", error);
    return NextResponse.json(
      { error: "템플릿 작가 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
