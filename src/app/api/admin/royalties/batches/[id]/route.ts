import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { GetRoyaltyBatchResponse } from "@/types/admin";
import { NextRequest, NextResponse } from "next/server";
import { toRoyaltySaleItem, toRoyaltySettlementBatchItem } from "../../_lib";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;

    const { data: batch, error: batchError } = await supabase
      .from("royalty_settlement_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: "정산 배치를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { data: royaltyRows, error: royaltyError } = await supabase
      .from("template_sale_royalty_details")
      .select("*")
      .eq("settlement_batch_id", id)
      .order("artist_name_snapshot", { ascending: true })
      .order("sale_paid_at", { ascending: false });

    if (royaltyError) {
      throw royaltyError;
    }

    const royalties = (royaltyRows || [])
      .map(toRoyaltySaleItem)
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return NextResponse.json<GetRoyaltyBatchResponse>({
      batch: toRoyaltySettlementBatchItem(batch),
      royalties,
    });
  } catch (error) {
    console.error("Royalty batch fetch error:", error);
    return NextResponse.json(
      { error: "정산 배치 상세 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
