import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { GetRoyaltyBatchesResponse } from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  parseDateRange,
  parsePagination,
  parseRoyaltyBatchStatus,
  toRoyaltySettlementBatchItem,
} from "../_lib";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { fromDate, toDate } = parseDateRange(
      searchParams.get("from"),
      searchParams.get("to")
    );
    const { page, limit, offset } = parsePagination(searchParams);
    const status = parseRoyaltyBatchStatus(searchParams.get("status"));

    let query = supabase
      .from("royalty_settlement_batches")
      .select("*", { count: "exact" })
      .gte("period_from", fromDate)
      .lte("period_to", toDate)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const total = count || 0;

    return NextResponse.json<GetRoyaltyBatchesResponse>({
      batches: (data || []).map(toRoyaltySettlementBatchItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Royalty batches fetch error:", error);
    return NextResponse.json(
      { error: "정산 배치 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
