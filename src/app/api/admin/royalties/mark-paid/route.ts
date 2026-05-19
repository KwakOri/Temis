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

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function getMonthStart(value: string): string {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

function getDefaultBatchTitle(settlementMonth: string, artistCount: number) {
  const date = new Date(`${settlementMonth}T00:00:00.000Z`);
  const artistLabel = artistCount === 1 ? "작가별" : "일괄";

  return `${date.getUTCFullYear()}년 ${
    date.getUTCMonth() + 1
  }월 ${artistLabel} 정산`;
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
    const rejectMissingRules = body.rejectMissingRules === true;
    const requestedTitle =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : null;

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
        totalAmount: 0,
      });
    }

    const { data: targetRoyalties, error: targetRoyaltiesError } = await supabase
      .from("template_sale_royalty_details")
      .select("id, royalty_amount, royalty_source, sale_paid_at, artist_id")
      .in("id", targetIds)
      .eq("status", "unpaid")
      .eq("sale_status", "completed");

    if (targetRoyaltiesError) {
      throw targetRoyaltiesError;
    }

    const payableRoyalties = targetRoyalties || [];

    if (
      rejectMissingRules &&
      payableRoyalties.some((royalty) => royalty.royalty_source === "missing")
    ) {
      return NextResponse.json(
        {
          error:
            "로열티 설정이 누락된 항목이 있어 정산 완료 처리할 수 없습니다.",
        },
        { status: 400 }
      );
    }

    if (payableRoyalties.length === 0) {
      return NextResponse.json<MarkRoyaltiesPaidResponse>({
        updatedCount: 0,
        totalAmount: 0,
      });
    }

    targetIds = payableRoyalties
      .map((royalty) => royalty.id)
      .filter((id): id is string => Boolean(id));

    const saleDates = payableRoyalties
      .map((royalty) => royalty.sale_paid_at)
      .filter((value): value is string => Boolean(value))
      .sort();
    const periodFrom = body.from || (saleDates[0] ? toDateOnly(saleDates[0]) : null);
    const periodTo =
      body.to ||
      (saleDates[saleDates.length - 1]
        ? toDateOnly(saleDates[saleDates.length - 1])
        : null);

    if (!periodFrom || !periodTo) {
      return NextResponse.json(
        { error: "정산 대상 판매일을 확인할 수 없습니다." },
        { status: 400 }
      );
    }

    const settlementMonth =
      typeof body.settlementMonth === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.settlementMonth)
        ? body.settlementMonth
        : getMonthStart(`${periodFrom}T00:00:00.000Z`);
    const totalAmount = payableRoyalties.reduce(
      (sum, royalty) => sum + (royalty.royalty_amount || 0),
      0
    );
    const distinctArtistCount = new Set(
      payableRoyalties.map((royalty) => royalty.artist_id).filter(Boolean)
    ).size;
    const now = new Date().toISOString();

    const { data: batch, error: batchError } = await supabase
      .from("royalty_settlement_batches")
      .insert({
        settlement_month: settlementMonth,
        period_from: periodFrom,
        period_to: periodTo,
        title: requestedTitle || getDefaultBatchTitle(settlementMonth, distinctArtistCount),
        status: "paid",
        total_amount: totalAmount,
        total_count: payableRoyalties.length,
        created_by: Number(adminCheck.user.userId),
        paid_by: Number(adminCheck.user.userId),
        paid_at: now,
      })
      .select("id, title")
      .single();

    if (batchError) {
      throw batchError;
    }

    const { data, error } = await supabase
      .from("template_sale_royalties")
      .update({
        status: "paid",
        paid_at: now,
        paid_by: Number(adminCheck.user.userId),
        settlement_batch_id: batch.id,
      })
      .in("id", targetIds)
      .eq("status", "unpaid")
      .select("id");

    if (error) {
      throw error;
    }

    await supabase.rpc("recalculate_royalty_settlement_batch", {
      p_batch_id: batch.id,
    });

    return NextResponse.json<MarkRoyaltiesPaidResponse>({
      updatedCount: data?.length || 0,
      totalAmount,
      batchId: batch.id,
      batchTitle: batch.title,
    });
  } catch (error) {
    console.error("Royalty bulk paid error:", error);
    return NextResponse.json(
      { error: "로열티 일괄 정산 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
