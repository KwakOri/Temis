import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { GetTemplateProductRoyaltySettingsResponse } from "@/types/admin";
import { Tables } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";
import { parseRoyaltyRuleInput } from "../../../royalties/_lib";

interface RouteParams {
  params: Promise<{
    templateId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { templateId } = await params;

    const { data: relations, error: relationsError } = await supabase
      .from("template_artists")
      .select(
        `
        artist_id,
        artist:artists(id, name, slug)
      `
      )
      .eq("template_id", templateId)
      .order("display_order", { ascending: true });

    if (relationsError) {
      throw relationsError;
    }

    const artistIds = (relations || [])
      .map((relation) => relation.artist_id)
      .filter(Boolean);

    let rules: Tables<"artist_royalty_rules">[] = [];

    if (artistIds.length > 0) {
      const { data, error } = await supabase
        .from("artist_royalty_rules")
        .select("*")
        .in("artist_id", artistIds)
        .or(`template_id.is.null,template_id.eq.${templateId}`);

      if (error) {
        throw error;
      }

      rules = data || [];
    }

    const defaultRuleByArtist = new Map(
      rules
        .filter((rule) => !rule.template_id)
        .map((rule) => [rule.artist_id, rule])
    );
    const templateRuleByArtist = new Map(
      rules
        .filter((rule) => rule.template_id === templateId)
        .map((rule) => [rule.artist_id, rule])
    );

    const response: GetTemplateProductRoyaltySettingsResponse = {
      templateId,
      artists: (relations || []).map((relation) => {
        const artist = Array.isArray(relation.artist)
          ? relation.artist[0]
          : relation.artist;
        const defaultRule = defaultRuleByArtist.get(relation.artist_id) || null;
        const templateRule = templateRuleByArtist.get(relation.artist_id) || null;
        const appliedRule = templateRule || defaultRule;

        return {
          artistId: relation.artist_id,
          artistName: artist?.name || "알 수 없는 작가",
          artistSlug: artist?.slug || null,
          defaultRule,
          templateRule,
          appliedRule,
          appliedSource: templateRule ? "template" : defaultRule ? "artist" : "missing",
        };
      }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Template product royalty settings fetch error:", error);
    return NextResponse.json(
      { error: "상품 로열티 설정 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { templateId } = await params;
    const body = await request.json();
    const artistId = typeof body.artistId === "string" ? body.artistId : null;
    const parsed = parseRoyaltyRuleInput(body);

    if (!artistId) {
      return NextResponse.json(
        { error: "artistId는 필수입니다." },
        { status: 400 }
      );
    }

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data: relation, error: relationError } = await supabase
      .from("template_artists")
      .select("id")
      .eq("artist_id", artistId)
      .eq("template_id", templateId)
      .maybeSingle();

    if (relationError) {
      throw relationError;
    }

    if (!relation) {
      return NextResponse.json(
        { error: "해당 템플릿에 연결된 작가가 아닙니다." },
        { status: 400 }
      );
    }

    const { data: existingRule, error: existingRuleError } = await supabase
      .from("artist_royalty_rules")
      .select("id")
      .eq("artist_id", artistId)
      .eq("template_id", templateId)
      .maybeSingle();

    if (existingRuleError) {
      throw existingRuleError;
    }

    if (parsed.deleteRule) {
      const { data: defaultRule, error: defaultRuleError } = await supabase
        .from("artist_royalty_rules")
        .select("id")
        .eq("artist_id", artistId)
        .is("template_id", null)
        .maybeSingle();

      if (defaultRuleError) {
        throw defaultRuleError;
      }

      if (!defaultRule) {
        const { data: visibleProduct, error: visibleProductError } =
          await supabase
            .from("shop_templates")
            .select("id")
            .eq("template_id", templateId)
            .eq("is_shop_visible", true)
            .maybeSingle();

        if (visibleProductError) {
          throw visibleProductError;
        }

        if (visibleProduct) {
          return NextResponse.json(
            {
              error:
                "작가 기본 로열티가 없는 상태에서는 판매 중인 템플릿의 로열티를 삭제할 수 없습니다.",
            },
            { status: 400 }
          );
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
        template_id: templateId,
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
    console.error("Template royalty rule update error:", error);
    return NextResponse.json(
      { error: "템플릿 로열티 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
