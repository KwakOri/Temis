import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { AdminRoyaltySummaryResponse, RoyaltyByArtist } from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import { parseDateRange, parseRoyaltyStatus } from "../_lib";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { fromDate, toDate, fromIso, toIso } = parseDateRange(
      searchParams.get("from"),
      searchParams.get("to")
    );
    const status = parseRoyaltyStatus(searchParams.get("status"));

    let query = supabase
      .from("template_sale_royalty_details")
      .select(
        `
        artist_id,
        artist_name_snapshot,
        royalty_amount,
        royalty_source,
        status,
        sale_amount,
        sale_paid_at,
        sale_status
      `
      )
      .gte("sale_paid_at", fromIso)
      .lte("sale_paid_at", toIso)
      .eq("sale_status", "completed");

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const byArtistMap = new Map<string, RoyaltyByArtist>();
    let unpaidRoyaltyAmount = 0;
    let paidRoyaltyAmount = 0;
    let unpaidCount = 0;
    let paidCount = 0;
    let missingRuleCount = 0;
    const dailyMap = new Map<
      string,
      { date: string; royaltyAmount: number; royaltyCount: number; missingRuleCount: number }
    >();

    for (const row of data || []) {
      if (!row.artist_id || !row.artist_name_snapshot) {
        continue;
      }

      const artistStat = byArtistMap.get(row.artist_id) || {
        artistId: row.artist_id,
        artistName: row.artist_name_snapshot,
        salesCount: 0,
        grossSales: 0,
        unpaidRoyaltyAmount: 0,
        paidRoyaltyAmount: 0,
        unpaidCount: 0,
        paidCount: 0,
        missingRuleCount: 0,
      };

      const royaltyAmount = row.royalty_amount || 0;
      const isMissingRule = row.royalty_source === "missing";
      artistStat.salesCount += 1;
      artistStat.grossSales += row.sale_amount || 0;
      artistStat.missingRuleCount =
        (artistStat.missingRuleCount || 0) + (isMissingRule ? 1 : 0);
      missingRuleCount += isMissingRule ? 1 : 0;

      if (row.sale_paid_at) {
        const date = row.sale_paid_at.slice(0, 10);
        const daily = dailyMap.get(date) || {
          date,
          royaltyAmount: 0,
          royaltyCount: 0,
          missingRuleCount: 0,
        };

        daily.royaltyAmount += royaltyAmount;
        daily.royaltyCount += 1;
        daily.missingRuleCount += isMissingRule ? 1 : 0;
        dailyMap.set(date, daily);
      }

      if (row.status === "paid") {
        artistStat.paidRoyaltyAmount += royaltyAmount;
        artistStat.paidCount += 1;
        paidRoyaltyAmount += royaltyAmount;
        paidCount += 1;
      } else {
        artistStat.unpaidRoyaltyAmount += royaltyAmount;
        artistStat.unpaidCount += 1;
        unpaidRoyaltyAmount += royaltyAmount;
        unpaidCount += 1;
      }

      byArtistMap.set(row.artist_id, artistStat);
    }

    const response: AdminRoyaltySummaryResponse = {
      summary: {
        from: fromDate,
        to: toDate,
        unpaidRoyaltyAmount,
        paidRoyaltyAmount,
        unpaidCount,
        paidCount,
        missingRuleCount,
      },
      byArtist: Array.from(byArtistMap.values()).sort(
        (a, b) =>
          b.unpaidRoyaltyAmount - a.unpaidRoyaltyAmount ||
          b.grossSales - a.grossSales
      ),
      daily: Array.from(dailyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Royalty summary fetch error:", error);
    return NextResponse.json(
      { error: "로열티 정산 요약 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
