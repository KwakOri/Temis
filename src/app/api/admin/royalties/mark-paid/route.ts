import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { MarkRoyaltiesPaidResponse } from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import { parseDateRange } from "../_lib";

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const royaltyIdsFromBody = normalizeIds(body.royaltyIds);
    const artistIds = normalizeIds(body.artistIds);
    const templateId = typeof body.templateId === "string" ? body.templateId : null;

    let targetIds = royaltyIdsFromBody;

    if (targetIds.length === 0) {
      const { fromIso, toIso } = parseDateRange(body.from, body.to);

      let targetQuery = supabase
        .from("template_sale_royalty_details")
        .select("id")
        .gte("sale_paid_at", fromIso)
        .lte("sale_paid_at", toIso)
        .eq("sale_status", "completed")
        .eq("status", "unpaid");

      if (artistIds.length > 0) {
        targetQuery = targetQuery.in("artist_id", artistIds);
      }

      if (templateId) {
        targetQuery = targetQuery.eq("template_id", templateId);
      }

      const { data, error } = await targetQuery;

      if (error) {
        throw error;
      }

      targetIds = (data || [])
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));
    }

    if (targetIds.length === 0) {
      return NextResponse.json<MarkRoyaltiesPaidResponse>({
        updatedCount: 0,
      });
    }

    const { data, error } = await supabase
      .from("template_sale_royalties")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: Number(adminCheck.user.userId),
      })
      .in("id", targetIds)
      .eq("status", "unpaid")
      .select("id");

    if (error) {
      throw error;
    }

    return NextResponse.json<MarkRoyaltiesPaidResponse>({
      updatedCount: data?.length || 0,
    });
  } catch (error) {
    console.error("Royalty bulk paid error:", error);
    return NextResponse.json(
      { error: "로열티 일괄 지급 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
