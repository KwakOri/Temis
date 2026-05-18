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
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "변경할 값이 없습니다." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("template_sale_royalties")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw error;
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
