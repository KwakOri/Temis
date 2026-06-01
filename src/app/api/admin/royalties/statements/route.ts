import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import {
  GetRoyaltyStatementResponse,
  RoyaltyStatementArtist,
} from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import { toRoyaltySaleItem, toRoyaltySettlementBatchItem } from "../_lib";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function getPreviousMonth(): string {
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

  return getPreviousMonth();
}

function getMonthStart(month: string): string {
  return `${month}-01`;
}

function minDate(values: Array<string | null | undefined>) {
  const dates = values.filter((value): value is string => Boolean(value)).sort();
  return dates[0] || null;
}

function maxDate(values: Array<string | null | undefined>) {
  const dates = values.filter((value): value is string => Boolean(value)).sort();
  return dates[dates.length - 1] || null;
}

function summarizeArtists(
  royalties: Array<NonNullable<ReturnType<typeof toRoyaltySaleItem>>>
) {
  const artistMap = new Map<
    string,
    RoyaltyStatementArtist & { saleIds: Set<string> }
  >();

  for (const royalty of royalties) {
    const artist = artistMap.get(royalty.artistId) || {
      artistId: royalty.artistId,
      artistName: royalty.artistName,
      salesCount: 0,
      grossSales: 0,
      royaltyAmount: 0,
      saleIds: new Set<string>(),
    };

    if (!artist.saleIds.has(royalty.templateSaleId)) {
      artist.saleIds.add(royalty.templateSaleId);
      artist.salesCount += 1;
      artist.grossSales += royalty.saleAmount;
    }

    artist.royaltyAmount += royalty.royaltyAmount;
    artistMap.set(royalty.artistId, artist);
  }

  return Array.from(artistMap.values())
    .map((artist) => ({
      artistId: artist.artistId,
      artistName: artist.artistName,
      salesCount: artist.salesCount,
      grossSales: artist.grossSales,
      royaltyAmount: artist.royaltyAmount,
    }))
    .sort(
      (a, b) =>
        b.royaltyAmount - a.royaltyAmount ||
        a.artistName.localeCompare(b.artistName)
    );
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = parseMonth(searchParams.get("month"));
    const settlementMonth = getMonthStart(month);
    const artistId =
      typeof searchParams.get("artistId") === "string" &&
      searchParams.get("artistId")
        ? searchParams.get("artistId")
        : null;

    const { data: batchRows, error: batchError } = await supabase
      .from("royalty_settlement_batches")
      .select("*")
      .eq("settlement_month", settlementMonth)
      .neq("status", "cancelled")
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (batchError) {
      throw batchError;
    }

    const { data: royaltyRows, error: royaltyError } = await supabase
      .from("template_sale_royalty_details")
      .select("*")
      .eq("settlement_month", settlementMonth)
      .eq("status", "paid")
      .neq("settlement_batch_status", "cancelled")
      .order("artist_name_snapshot", { ascending: true })
      .order("sale_paid_at", { ascending: true });

    if (royaltyError) {
      throw royaltyError;
    }

    const allRoyalties = (royaltyRows || [])
      .map(toRoyaltySaleItem)
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const royalties = artistId
      ? allRoyalties.filter((royalty) => royalty.artistId === artistId)
      : allRoyalties;
    const saleAmountBySaleId = new Map<string, number>();

    for (const royalty of royalties) {
      if (!saleAmountBySaleId.has(royalty.templateSaleId)) {
        saleAmountBySaleId.set(royalty.templateSaleId, royalty.saleAmount);
      }
    }

    const allBatchItems = (batchRows || []).map(toRoyaltySettlementBatchItem);
    const visibleBatchIds = new Set(
      royalties
        .map((royalty) => royalty.settlementBatchId)
        .filter((batchId): batchId is string => Boolean(batchId))
    );
    const batches = artistId
      ? allBatchItems.filter((batch) => visibleBatchIds.has(batch.id))
      : allBatchItems;
    const artists = summarizeArtists(allRoyalties);
    const filteredArtists = summarizeArtists(royalties);

    const response: GetRoyaltyStatementResponse = {
      summary: {
        month,
        settlementMonth,
        periodFrom: minDate(batches.map((batch) => batch.periodFrom)),
        periodTo: maxDate(batches.map((batch) => batch.periodTo)),
        batchCount: batches.length,
        artistCount: filteredArtists.length,
        salesCount: saleAmountBySaleId.size,
        grossSales: Array.from(saleAmountBySaleId.values()).reduce(
          (sum, amount) => sum + amount,
          0
        ),
        royaltyAmount: royalties.reduce(
          (sum, royalty) => sum + royalty.royaltyAmount,
          0
        ),
        paidAt: maxDate(batches.map((batch) => batch.paidAt)),
      },
      artists,
      batches,
      royalties,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Royalty statement fetch error:", error);
    return NextResponse.json(
      { error: "월별 로열티 정산 내역 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
