import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesUpdate } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";
import { toRoyaltySaleItem } from "../../_lib";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
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

function getSingleRoyaltyBatchTitle(artistName: string, salePaidAt: string) {
  const date = new Date(salePaidAt);
  return `${date.getUTCFullYear()}년 ${
    date.getUTCMonth() + 1
  }월 ${artistName} 개별 정산`;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, royaltyAmount } = body as {
      status?: string;
      royaltyAmount?: number;
    };

    const updates: TablesUpdate<"template_sale_royalties"> = {};
    const { data: currentRoyalty, error: currentRoyaltyError } = await supabase
      .from("template_sale_royalty_details")
      .select("*")
      .eq("id", id)
      .single();

    if (currentRoyaltyError || !currentRoyalty) {
      return NextResponse.json(
        { error: "로열티 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const previousBatchId = currentRoyalty.settlement_batch_id;
    let nextBatchId: string | null | undefined = undefined;

    if (status !== undefined) {
      if (status !== "paid" && status !== "unpaid") {
        return NextResponse.json(
          { error: "status는 paid 또는 unpaid만 가능합니다." },
          { status: 400 }
        );
      }

      updates.status = status;
      updates.paid_at = status === "paid" ? new Date().toISOString() : null;
      updates.paid_by =
        status === "paid" ? Number(adminCheck.user.userId) : null;
      updates.settlement_batch_id = null;
    }

    if (royaltyAmount !== undefined) {
      if (
        typeof royaltyAmount !== "number" ||
        !Number.isFinite(royaltyAmount) ||
        royaltyAmount < 0
      ) {
        return NextResponse.json(
          { error: "royaltyAmount는 0 이상의 숫자여야 합니다." },
          { status: 400 }
        );
      }

      updates.royalty_amount = Math.round(royaltyAmount);
      updates.royalty_source = "manual";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "변경할 값이 없습니다." },
        { status: 400 }
      );
    }

    if (
      status === "paid" &&
      currentRoyalty.sale_paid_at &&
      currentRoyalty.artist_name_snapshot
    ) {
      const nextRoyaltyAmount =
        updates.royalty_amount ?? currentRoyalty.royalty_amount ?? 0;

      if (currentRoyalty.settlement_batch_id) {
        nextBatchId = currentRoyalty.settlement_batch_id;
        updates.settlement_batch_id = currentRoyalty.settlement_batch_id;
      } else {
        const saleDate = toDateOnly(currentRoyalty.sale_paid_at);
        const { data: batch, error: batchError } = await supabase
          .from("royalty_settlement_batches")
          .insert({
            settlement_month: getMonthStart(currentRoyalty.sale_paid_at),
            period_from: saleDate,
            period_to: saleDate,
            title: getSingleRoyaltyBatchTitle(
              currentRoyalty.artist_name_snapshot,
              currentRoyalty.sale_paid_at
            ),
            status: "paid",
            total_amount: nextRoyaltyAmount,
            total_count: 1,
            created_by: Number(adminCheck.user.userId),
            paid_by: Number(adminCheck.user.userId),
            paid_at: updates.paid_at,
          })
          .select("id")
          .single();

        if (batchError) {
          throw batchError;
        }

        nextBatchId = batch.id;
        updates.settlement_batch_id = batch.id;
      }
    }

    const { error } = await supabase
      .from("template_sale_royalties")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw error;
    }

    if (previousBatchId && previousBatchId !== nextBatchId) {
      await supabase.rpc("recalculate_royalty_settlement_batch", {
        p_batch_id: previousBatchId,
      });
    }

    if (nextBatchId) {
      await supabase.rpc("recalculate_royalty_settlement_batch", {
        p_batch_id: nextBatchId,
      });
    }

    const { data, error: fetchError } = await supabase
      .from("template_sale_royalty_details")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const royalty = toRoyaltySaleItem(data);

    return NextResponse.json({
      success: true,
      royalty,
    });
  } catch (error) {
    console.error("Royalty update error:", error);
    return NextResponse.json(
      { error: "로열티 지급 상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
