import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import {
  ArtistRoyaltySettingsItem,
  GetArtistRoyaltySettingsResponse,
} from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { data: artists, error: artistsError } = await supabase
      .from("artists")
      .select("id, name, slug, is_active")
      .order("name", { ascending: true });

    if (artistsError) {
      throw artistsError;
    }

    const { data: publicTemplates, error: templatesError } = await supabase
      .from("templates")
      .select("id")
      .eq("is_public", true);

    if (templatesError) {
      throw templatesError;
    }

    const publicTemplateIds = (publicTemplates || []).map((template) => template.id);
    let templateArtists: { artist_id: string; template_id: string }[] = [];

    if (publicTemplateIds.length > 0) {
      const { data, error } = await supabase
        .from("template_artists")
        .select("artist_id, template_id")
        .in("template_id", publicTemplateIds);

      if (error) {
        throw error;
      }

      templateArtists = data || [];
    }

    const { data: rules, error: rulesError } = await supabase
      .from("artist_royalty_rules")
      .select("*");

    if (rulesError) {
      throw rulesError;
    }

    const defaultRuleByArtist = new Map(
      (rules || [])
        .filter((rule) => !rule.template_id)
        .map((rule) => [rule.artist_id, rule])
    );
    const templateRuleKeys = new Set(
      (rules || [])
        .filter((rule) => rule.template_id)
        .map((rule) => `${rule.artist_id}:${rule.template_id}`)
    );
    const templateCountByArtist = new Map<string, number>();
    const overrideCountByArtist = new Map<string, number>();
    const missingCountByArtist = new Map<string, number>();

    for (const relation of templateArtists) {
      templateCountByArtist.set(
        relation.artist_id,
        (templateCountByArtist.get(relation.artist_id) || 0) + 1
      );

      const hasTemplateRule = templateRuleKeys.has(
        `${relation.artist_id}:${relation.template_id}`
      );

      if (hasTemplateRule) {
        overrideCountByArtist.set(
          relation.artist_id,
          (overrideCountByArtist.get(relation.artist_id) || 0) + 1
        );
      }

      if (!hasTemplateRule && !defaultRuleByArtist.has(relation.artist_id)) {
        missingCountByArtist.set(
          relation.artist_id,
          (missingCountByArtist.get(relation.artist_id) || 0) + 1
        );
      }
    }

    const response: GetArtistRoyaltySettingsResponse = {
      artists: (artists || []).map<ArtistRoyaltySettingsItem>((artist) => ({
        artistId: artist.id,
        artistName: artist.name,
        artistSlug: artist.slug,
        isActive: artist.is_active,
        defaultRule: defaultRuleByArtist.get(artist.id) || null,
        publicTemplateCount: templateCountByArtist.get(artist.id) || 0,
        templateOverrideCount: overrideCountByArtist.get(artist.id) || 0,
        missingTemplateCount: missingCountByArtist.get(artist.id) || 0,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Royalty settings artists fetch error:", error);
    return NextResponse.json(
      { error: "작가 로열티 설정 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
