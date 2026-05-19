import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { GetTemplateRoyaltySettingsResponse } from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    artistId: string;
  }>;
}

type TemplateRow = {
  id: string;
  name: string;
  is_public: boolean;
  shop_templates?: { is_shop_visible: boolean | null }[] | null;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { artistId } = await params;

    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, name, slug")
      .eq("id", artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json(
        { error: "작가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { data: relations, error: relationsError } = await supabase
      .from("template_artists")
      .select("template_id")
      .eq("artist_id", artistId);

    if (relationsError) {
      throw relationsError;
    }

    const templateIds = (relations || []).map((relation) => relation.template_id);
    let templates: TemplateRow[] = [];

    if (templateIds.length > 0) {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, is_public, shop_templates(is_shop_visible)")
        .in("id", templateIds)
        .eq("is_public", true)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      templates = (data || []) as TemplateRow[];
    }

    const publicTemplateIds = templates.map((template) => template.id);
    const { data: rules, error: rulesError } = await supabase
      .from("artist_royalty_rules")
      .select("*")
      .eq("artist_id", artistId);

    if (rulesError) {
      throw rulesError;
    }

    const defaultRule =
      (rules || []).find((rule) => rule.template_id === null) || null;
    const templateRuleByTemplateId = new Map(
      (rules || [])
        .filter(
          (rule) => rule.template_id && publicTemplateIds.includes(rule.template_id)
        )
        .map((rule) => [rule.template_id, rule])
    );

    const response: GetTemplateRoyaltySettingsResponse = {
      artist,
      templates: templates.map((template) => {
        const templateRule = templateRuleByTemplateId.get(template.id) || null;
        const appliedRule = templateRule || defaultRule;

        return {
          templateId: template.id,
          templateName: template.name,
          isPublic: template.is_public,
          isShopVisible: Boolean(template.shop_templates?.[0]?.is_shop_visible),
          defaultRule,
          templateRule,
          appliedRule,
          appliedSource: templateRule ? "template" : defaultRule ? "artist" : "missing",
        };
      }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Template royalty settings fetch error:", error);
    return NextResponse.json(
      { error: "템플릿 로열티 설정 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
