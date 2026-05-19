import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { GetRoyaltySalesResponse } from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  parseDateRange,
  parsePagination,
  parseRoyaltyStatus,
  toRoyaltySaleItem,
} from "../_lib";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { fromIso, toIso } = parseDateRange(
      searchParams.get("from"),
      searchParams.get("to")
    );
    const { page, limit, offset } = parsePagination(searchParams);
    const status = parseRoyaltyStatus(searchParams.get("status"));
    const artistId = searchParams.get("artistId");
    const templateId = searchParams.get("templateId");

    let query = supabase
      .from("template_sale_royalty_details")
      .select("*", { count: "exact" })
      .gte("sale_paid_at", fromIso)
      .lte("sale_paid_at", toIso)
      .eq("sale_status", "completed")
      .order("sale_paid_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (artistId) {
      query = query.eq("artist_id", artistId);
    }

    if (templateId) {
      query = query.eq("template_id", templateId);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const royalties = (data || [])
      .map(toRoyaltySaleItem)
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const total = count || 0;

    const response: GetRoyaltySalesResponse = {
      royalties,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Royalty sales fetch error:", error);
    return NextResponse.json(
      { error: "로열티 판매 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
