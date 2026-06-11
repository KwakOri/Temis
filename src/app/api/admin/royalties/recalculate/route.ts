import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { RecalculateRoyaltiesResponse } from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import { parseDateRange } from "../_lib";

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

function calculateRoyaltyAmount(
  saleAmount: number,
  royaltyType: string,
  royaltyValue: number
) {
  if (royaltyType === "fixed") {
    return Math.max(0, Math.round(royaltyValue));
  }

  if (royaltyType === "percentage") {
    return Math.max(0, Math.round((saleAmount * royaltyValue) / 100));
  }

  return 0;
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const royaltyIds = normalizeIds(body.royaltyIds);
    const artistIds = normalizeIds(body.artistIds);
    const templateId = typeof body.templateId === "string" ? body.templateId : null;
    const includePaid = Boolean(body.includePaid);
    const includeManual = Boolean(body.includeManual);

    let query = supabase
      .from("template_sale_royalty_details")
      .select("id, artist_id, template_id, sale_amount, status, royalty_source")
      .eq("sale_status", "completed");

    if (royaltyIds.length > 0) {
      query = query.in("id", royaltyIds);
    } else {
      const { fromIso, toIso } = parseDateRange(body.from, body.to);
      query = query.gte("sale_paid_at", fromIso).lte("sale_paid_at", toIso);
    }

    if (!includePaid) {
      query = query.eq("status", "unpaid");
    }

    if (artistIds.length > 0) {
      query = query.in("artist_id", artistIds);
    }

    if (templateId) {
      query = query.eq("template_id", templateId);
    }

    const { data: royalties, error: royaltiesError } = await query;

    if (royaltiesError) {
      throw royaltiesError;
    }

    const rows = (royalties || []).filter(
      (row) =>
        row.id &&
        row.artist_id &&
        row.template_id &&
        (includeManual || row.royalty_source !== "manual")
    );

    if (rows.length === 0) {
      return NextResponse.json<RecalculateRoyaltiesResponse>({
        updatedCount: 0,
      });
    }

    const targetArtistIds = Array.from(
      new Set(rows.map((row) => row.artist_id).filter(Boolean) as string[])
    );
    const targetTemplateIds = Array.from(
      new Set(rows.map((row) => row.template_id).filter(Boolean) as string[])
    );

    const { data: rules, error: rulesError } = await supabase
      .from("artist_royalty_rules")
      .select("*")
      .in("artist_id", targetArtistIds)
      .or(
        `template_id.is.null,template_id.in.(${targetTemplateIds.join(",")})`
      );

    if (rulesError) {
      throw rulesError;
    }

    const defaultRuleByArtist = new Map<string, NonNullable<typeof rules>[number]>();
    const templateRuleByArtistAndTemplate = new Map<
      string,
      NonNullable<typeof rules>[number]
    >();

    for (const rule of rules || []) {
      if (rule.template_id) {
        templateRuleByArtistAndTemplate.set(
          `${rule.artist_id}:${rule.template_id}`,
          rule
        );
      } else {
        defaultRuleByArtist.set(rule.artist_id, rule);
      }
    }

    let updatedCount = 0;

    for (const row of rows) {
      if (!row.id || !row.artist_id || !row.template_id) {
        continue;
      }

      const rule =
        templateRuleByArtistAndTemplate.get(
          `${row.artist_id}:${row.template_id}`
        ) || defaultRuleByArtist.get(row.artist_id);
      const royaltyAmount = rule
        ? calculateRoyaltyAmount(
            row.sale_amount || 0,
            rule.royalty_type,
            rule.royalty_value
          )
        : 0;
      const { error: updateError } = await supabase
        .from("template_sale_royalties")
        .update({
          royalty_amount: royaltyAmount,
          royalty_rule_id: rule?.id || null,
          royalty_source: rule
            ? rule.template_id
              ? "template"
              : "artist"
            : "missing",
          royalty_type_snapshot: rule?.royalty_type || null,
          royalty_value_snapshot: rule?.royalty_value || null,
        })
        .eq("id", row.id);

      if (updateError) {
        throw updateError;
      }

      updatedCount += 1;
    }

    return NextResponse.json<RecalculateRoyaltiesResponse>({
      updatedCount,
    });
  } catch (error) {
    console.error("Royalty recalculation error:", error);
    return NextResponse.json(
      { error: "로열티 재계산 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
