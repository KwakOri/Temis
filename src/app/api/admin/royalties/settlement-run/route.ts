import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import {
  AdminRoyaltySettlementRunResponse,
  RoyaltySettlementRunArtist,
} from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import { toRoyaltySaleItem } from "../_lib";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate()
  )}`;
}

function getDefaultMonth(): string {
  const today = new Date();
  const previousMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
  );

  return `${previousMonth.getUTCFullYear()}-${pad2(
    previousMonth.getUTCMonth() + 1
  )}`;
}

function parseMonth(value?: string | null): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return getDefaultMonth();
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));

  return {
    periodFrom: formatDate(start),
    periodTo: formatDate(end),
    fromIso: `${formatDate(start)}T00:00:00.000Z`,
    toIso: `${formatDate(end)}T23:59:59.999Z`,
  };
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = parseMonth(searchParams.get("month"));
    const { periodFrom, periodTo, fromIso, toIso } = getMonthRange(month);

    const { data, error } = await supabase
      .from("template_sale_royalty_details")
      .select("*")
      .gte("sale_paid_at", fromIso)
      .lte("sale_paid_at", toIso)
      .eq("sale_status", "completed")
      .eq("status", "unpaid")
      .order("artist_name_snapshot", { ascending: true })
      .order("sale_paid_at", { ascending: true });

    if (error) {
      throw error;
    }

    const royalties = (data || [])
      .map(toRoyaltySaleItem)
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const artistMap = new Map<string, RoyaltySettlementRunArtist>();
    const saleAmountBySaleId = new Map<string, number>();
    let royaltyAmount = 0;
    let missingRuleCount = 0;

    for (const royalty of royalties) {
      const artist = artistMap.get(royalty.artistId) || {
        artistId: royalty.artistId,
        artistName: royalty.artistName,
        salesCount: 0,
        grossSales: 0,
        royaltyAmount: 0,
        missingRuleCount: 0,
        royalties: [],
      };
      const isMissingRule = royalty.royaltySource === "missing";

      artist.salesCount += 1;
      artist.grossSales += royalty.saleAmount;
      artist.royaltyAmount += royalty.royaltyAmount;
      artist.missingRuleCount += isMissingRule ? 1 : 0;
      artist.royalties.push(royalty);

      royaltyAmount += royalty.royaltyAmount;
      missingRuleCount += isMissingRule ? 1 : 0;

      if (!saleAmountBySaleId.has(royalty.templateSaleId)) {
        saleAmountBySaleId.set(royalty.templateSaleId, royalty.saleAmount);
      }

      artistMap.set(royalty.artistId, artist);
    }

    const artists = Array.from(artistMap.values()).sort(
      (a, b) =>
        b.missingRuleCount - a.missingRuleCount ||
        b.royaltyAmount - a.royaltyAmount ||
        a.artistName.localeCompare(b.artistName)
    );

    const response: AdminRoyaltySettlementRunResponse = {
      summary: {
        month,
        periodFrom,
        periodTo,
        artistCount: artists.length,
        salesCount: royalties.length,
        grossSales: Array.from(saleAmountBySaleId.values()).reduce(
          (sum, amount) => sum + amount,
          0
        ),
        royaltyAmount,
        missingRuleCount,
      },
      artists,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Royalty settlement run fetch error:", error);
    return NextResponse.json(
      { error: "월별 정산 대상 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
