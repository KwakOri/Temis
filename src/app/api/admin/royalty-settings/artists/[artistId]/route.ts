import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { parseRoyaltyRuleInput } from "../../../royalties/_lib";

interface RouteParams {
  params: Promise<{
    artistId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { artistId } = await params;
    const body = await request.json();
    const parsed = parseRoyaltyRuleInput(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id")
      .eq("id", artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json(
        { error: "작가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { data: existingRule, error: existingRuleError } = await supabase
      .from("artist_royalty_rules")
      .select("id")
      .eq("artist_id", artistId)
      .is("template_id", null)
      .maybeSingle();

    if (existingRuleError) {
      throw existingRuleError;
    }

    if (parsed.deleteRule) {
      const { data: artistTemplates, error: artistTemplatesError } = await supabase
        .from("template_artists")
        .select("template_id")
        .eq("artist_id", artistId);

      if (artistTemplatesError) {
        throw artistTemplatesError;
      }

      const templateIds = (artistTemplates || []).map((item) => item.template_id);

      if (templateIds.length > 0) {
        const { data: visibleProducts, error: visibleProductsError } =
          await supabase
            .from("shop_templates")
            .select("template_id, title")
            .in("template_id", templateIds)
            .eq("is_shop_visible", true);

        if (visibleProductsError) {
          throw visibleProductsError;
        }

        const visibleTemplateIds = (visibleProducts || [])
          .map((item) => item.template_id)
          .filter(Boolean);

        if (visibleTemplateIds.length > 0) {
          const { data: templateRules, error: templateRulesError } =
            await supabase
              .from("artist_royalty_rules")
              .select("template_id")
              .eq("artist_id", artistId)
              .in("template_id", visibleTemplateIds);

          if (templateRulesError) {
            throw templateRulesError;
          }

          const overrideTemplateIds = new Set(
            (templateRules || [])
              .map((rule) => rule.template_id)
              .filter(Boolean)
          );
          const missingVisibleProduct = (visibleProducts || []).find(
            (item) =>
              item.template_id && !overrideTemplateIds.has(item.template_id)
          );

          if (missingVisibleProduct) {
            return NextResponse.json(
              {
                error:
                  "판매 중인 템플릿에 적용할 로열티가 없어집니다. 템플릿별 로열티를 먼저 설정하거나 판매를 중지해 주세요.",
              },
              { status: 400 }
            );
          }
        }
      }

      if (existingRule) {
        const { error } = await supabase
          .from("artist_royalty_rules")
          .delete()
          .eq("id", existingRule.id);

        if (error) {
          throw error;
        }
      }

      return NextResponse.json({
        success: true,
        rule: null,
      });
    }

    if (existingRule) {
      const { data, error } = await supabase
        .from("artist_royalty_rules")
        .update({
          royalty_type: parsed.royaltyType,
          royalty_value: parsed.royaltyValue,
        })
        .eq("id", existingRule.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        rule: data,
      });
    }

    const { data, error } = await supabase
      .from("artist_royalty_rules")
      .insert({
        artist_id: artistId,
        template_id: null,
        royalty_type: parsed.royaltyType,
        royalty_value: parsed.royaltyValue,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      rule: data,
    });
  } catch (error) {
    console.error("Artist royalty rule update error:", error);
    return NextResponse.json(
      { error: "작가 기본 로열티 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
